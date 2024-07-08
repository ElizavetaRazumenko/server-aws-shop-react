import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { getHeaders } from './helpers';
const {uuid} = require('uuidv4');

const dynamoDb = new DynamoDB.DocumentClient({ region: 'eu-central-1' });

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const body = JSON.parse(event.body!);
  
    console.log('Received product data: ', JSON.stringify(body, null, 2));

    const { title, description, price, count } = body;
  
    const { PRODUCTS, STOCK } = process.env;

    if (!title || !description || !price) {
      return {
        statusCode: 400,
        headers: {
          ...getHeaders(),
          'Access-Control-Allow-Methods': 'GET, POST',
        },
        body: JSON.stringify({
          message: "Title, description and price fields are required"
        })
      };
    }

    const id = uuid();

    await dynamoDb.transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: PRODUCTS!,
            Item: {
              id,
              title,
              description,
              price
            }
          }
        },
        {
          Put: {
            TableName: STOCK!,
            Item: {
              product_id: id,
              count: count || 1
            }
          }
        }
      ]
    }).promise();

    console.log('Product are created, id: ', id);

    return {
      statusCode: 201,
      headers: {
        ...getHeaders(),
        'Access-Control-Allow-Methods': "GET, POST",
      },
      body: JSON.stringify({ id })
    };

  } catch (e) {
    console.log('Error of creating product: ', e);

    return {
      statusCode: 500,
      headers: {
        ...getHeaders(),
        'Access-Control-Allow-Methods': "GET, POST",
      },
      body: JSON.stringify({ error: 'Failed to add product' })
    };
  }
};