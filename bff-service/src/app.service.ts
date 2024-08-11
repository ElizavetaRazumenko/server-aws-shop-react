import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Services } from './constants';
import { IncomingHttpHeaders } from 'http';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  public async redirect({
    query,
    url,
    method,
    headers,
    body,
    service,
  }: {
    query: string;
    url: string;
    method: string;
    headers: IncomingHttpHeaders;
    body: any;
    service: Services;
  }) {
    const serviceUrl = url.replace(
      `/${service}/`,
      this.configService.get(`${service.toUpperCase()}_SERVICE_URL`),
    );
    const token = headers?.authorization;
    console.log('Token: ', token);

    const { status, data } = await firstValueFrom(
      this.httpService
        .request({
          url: serviceUrl,
          method,
          params: query,
          ...(token && headers
            ? {
                headers: {
                  Authorization: token,
                },
              }
            : {}),
          ...(body && Object.keys(body).length > 0
            ? {
                data: body,
              }
            : {}),
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.log('Error: ', error.response?.data ?? error);
            throw new HttpException(
              error.response?.data ?? 'An error occured',
              error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }),
        ),
    );

    if (
      service === Services.PRODUCT &&
      method === 'GET' &&
      url === '/product/products'
    ) {
      console.log('Cache created');
      await this.cacheManager.set('products', {
        status,
        data,
      });
    }

    return { status, data };
  }
}
