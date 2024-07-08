import { APIGatewayProxyEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  DynamoDB,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { getHeaders } from './helpers';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamoDb = DynamoDBDocument.from(new DynamoDB({ region: 'eu-central-1' }));

const { PRODUCTS, STOCK } = process.env;

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    console.log('Received product data: ', event.body);
    const body = JSON.parse(event.body!);
  
    const { title, description, price, count } = body;

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

    const id = randomUUID();

    await dynamoDb.send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: PRODUCTS || '',
            Item: marshall({
              id,
              title,
              description,
              price
            })
          }
        },
        {
          Put: {
            TableName: STOCK || '',
            Item: marshall({
              product_id: id,
              count: count || 1
            })
          }
        }
      ]
    }));

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