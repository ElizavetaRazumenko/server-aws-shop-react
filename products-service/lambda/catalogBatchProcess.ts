import { SQSEvent } from 'aws-lambda';
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Product, ProductWithStock, Stock } from '../types/types';
import { randomUUID } from "crypto";
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import {
  DynamoDB,
  TransactWriteItem,
  TransactWriteItemsCommand
} from "@aws-sdk/client-dynamodb";
import { getHeaders } from './helpers';
import { marshall } from "@aws-sdk/util-dynamodb";

const dynamoDb = DynamoDBDocument.from(new DynamoDB({ region: 'eu-central-1' }));
const client = new SNSClient({});

const { PRODUCTS, STOCK, SNS_TOPIC_ARN } = process.env;

export const handler = async (event: SQSEvent) => {
  console.log('Handle event:', JSON.stringify(event, null, 2));
  const products: ProductWithStock[] = [];
  const transactions: TransactWriteItem[] = [];

  try {

    for (const msg of event.Records) {
      console.log('Processing message:', JSON.stringify(msg, null, 2));
      const body = JSON.parse(msg.body)

      const { title, description, price, count } = body;

      if (!title || !description || !price || !count) {
        console.error('Missing required parameters:', { title, description, price, count });

        return {
          statusCode: 400,
          headers: {
            ...getHeaders(),
            'Access-Control-Allow-Methods': 'GET',
          },
          body: JSON.stringify({ 
            message: "Some of the required parameters is missing"
          }),
        };
      }

      const createdProduct: Product = {
        id: randomUUID(),
        title,
        description,
        price,
      };

      const createdStock: Stock = {
        product_id: createdProduct.id,
        count,
      };

      products.push({ ...createdProduct, count: createdStock.count })

      transactions.push({
        Put: {
          TableName: PRODUCTS ?? '',
          Item: marshall(createdProduct),
        },
      }, 
      {
        Put: {
          TableName: STOCK ?? '',
          Item: marshall(createdStock),
        },
      });

      console.log('Created product and stock:', { createdProduct, createdStock });
    }

    console.log('Executing TransactWriteItemsCommand with transactions:', JSON.stringify(transactions, null, 2));
    await dynamoDb.send(new TransactWriteItemsCommand({
      TransactItems: transactions,
    }));

    console.log('Sending SNS notification with products:', JSON.stringify(products, null, 2));
    await client.send(
      new PublishCommand({
        Subject: "Products created",
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({
          message: "Csv products successfully added to the Database",
          products: products,
          count: products.length,
        }),
      })
    );

    console.log('Products successfully created and notification sent');

    return {
      statusCode: 201,
      headers: {
        ...getHeaders(),
        'Access-Control-Allow-Methods': 'GET',
      },
      body: JSON.stringify({ 
        message: "Products created"
      }),
    }

  } catch (e) {
    console.error('Error occurred:', e);

    return {
      statusCode: 500,
      headers: {
        ...getHeaders(),
        'Access-Control-Allow-Methods': 'GET',
      },
      body: JSON.stringify({ 
        message: `Products creation failed: ${e}`
      }),
    }

  }
  
};