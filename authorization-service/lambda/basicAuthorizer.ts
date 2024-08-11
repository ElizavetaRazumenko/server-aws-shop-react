import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { getHeaders } from './helpers';

export const handler = async (event: APIGatewayRequestAuthorizerEvent) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  const auth = event.headers?.['Authorization'];
  const token = auth?.split(' ')[1] ?? '';

  console.log('Authorization header:', auth);
  console.log('Token:', token); 

  if (event.type !== 'REQUEST' || !token ) {
    console.log('Unauthorized request');

    return {
      headers: {
        ...getHeaders(),
      },
      statusCode: 401,
      body: JSON.stringify({ 
        message: 'Unauthorized'
      }),
    };
  }
  let username = '';
  let password = '';

  try {
    const data = Buffer.from(token, 'base64').toString('utf-8');
    if (data.indexOf(':') !== -1) {
      const value = Buffer.from(token, 'base64').toString('utf-8').split(':');
      username = value[0];
      password = value[1];
    }

    if (data.indexOf('=') !== -1) {
      const value = Buffer.from(token, 'base64').toString('utf-8').split('=');
      username = value[0];
      password = value[1];
    }

    console.log('Decoded username and password:', username, password);

    const envPassword = process.env.elizavetarazumenko;
    console.log('Environment password:', envPassword);
  
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: password !== envPassword ? 'Deny' : 'Allow',
          Resource: event.methodArn,
        },
      ],
    }
    console.log('Policy document:', JSON.stringify(policyDocument, null, 2));

    console.log('Как же заебала эта ебатория')

    return {
      principalId: token,
      policyDocument,
    };
    
  } catch (e) {
    console.error('Error occurred:', e);

    return {
      headers: {
        ...getHeaders(),
      },
      statusCode: 401,
      body: JSON.stringify({ 
        message:  `Unauthorized error: ${e}`
      }),
    };
  }
}