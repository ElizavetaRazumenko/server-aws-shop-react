import {
  All,
  BadGatewayException,
  Body,
  Controller,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { AppService } from './app.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Services } from './constants';
import { Request, Response } from 'express';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @All(':service/*')
  async redirect(
    @Res() res: Response,
    @Param('service') service: Services,
    @Req() req: Request,
    @Query() query: string,
    @Body() body: any,
  ) {
    if (![Services.CART, Services.PRODUCT].includes(service)) {
      throw new BadGatewayException('Cannot process request');
    }

    const { url, headers, method } = req;
    const productsInCache: { status: HttpStatus; data: any } | undefined =
      await this.cacheManager.get('products');

    if (productsInCache && service === Services.PRODUCT && method === 'GET') {
      console.log('Get products from cache', productsInCache);

      return res.status(productsInCache.status).send(productsInCache.data);
    }

    delete headers.host;
    delete headers.referer;

    const responseData = await this.appService.redirect({
      query,
      url,
      method,
      headers,
      body,
      service,
    });

    return res.status(responseData.status).send(responseData.data);
  }
}
