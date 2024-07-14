import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { getHeaders } from './helpers';

export const handler = async (event: APIGatewayRequestAuthorizerEvent) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  const auth = event.headers?.['Authorization'];
  const token = auth?.split(' ')[2] ?? '';

  console.log('Authorization header:', auth);
  console.log('Token:', token); 

  if (event.type !== 'REQUEST' || !token ) {
    console.log('Unauthorized request');

    return {
      headers: getHeaders(),
      statusCode: 401,
      body: JSON.stringify({ 
        message: 'Unauthorized'
      }),
    };
  }

  try {
    const [username, password] = Buffer.from(token, 'base64').toString('utf-8').split(':');
    console.log('Decoded username and password:', username, password);

    const envPassword = process.env[username];
    console.log('Environment password:', envPassword);
  
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: envPassword && password === envPassword ? 'Deny' : 'Allow',
          Resource: event.methodArn,
        },
      ],
    }
    console.log('Policy document:', JSON.stringify(policyDocument, null, 2));

    return {
      principalId: token,
      policyDocument,
    };
    
  } catch (e) {
    console.error('Error occurred:', e);

    return {
      headers: getHeaders(),
      statusCode: 401,
      body: JSON.stringify({ 
        message:  `Unauthorized error: ${e}`
      }),
    };
  }
}