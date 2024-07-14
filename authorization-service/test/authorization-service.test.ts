import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { handler } from '../lambda/basicAuthorizer';
import { getHeaders } from '../lambda/helpers';

describe('Lambda Handler', () => {
  const OLD_ENV = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });
  
  afterAll(() => {
    process.env = OLD_ENV;
  });
  
  it('should return 401 if event type is not REQUEST or token is missing', async () => {
    const event = {
      type: 'TOKEN',
      headers: {},
    } as unknown as APIGatewayRequestAuthorizerEvent;

    const response = await handler(event);

    expect(response).toEqual({
      headers: getHeaders(),
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized',
      }),
    });
  });

  it('should return 401 if token is invalid', async () => {
    const event = {
      type: 'REQUEST',
      headers: {
        Authorization: 'Bearer invalid_token',
      },
    } as unknown as APIGatewayRequestAuthorizerEvent;

    const response = await handler(event);

    expect(response).toEqual({
      headers: getHeaders(),
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized',
      }),
    });
  });



  it('should return 401 if environment variable for user is not set', async () => {
    const token = Buffer.from('elizavetarazumenko:TEST_PASSWORD').toString('base64');
    delete process.env['elizavetarazumenko'];

    const event = {
      type: 'REQUEST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      methodArn: 'arn:aws:execute-api:region:account-id:api-id/stage/method/resource-path',
    } as unknown as APIGatewayRequestAuthorizerEvent;

    const response = await handler(event);

    expect(response).toEqual({
      headers: getHeaders(),
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized',
      }),
    });
  });
});