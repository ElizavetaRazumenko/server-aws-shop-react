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

export const handler = async (event: SQSEvent) => {
  const { PRODUCTS, STOCK, SNS_TOPIC_ARN } = process.env;
  const transactions: TransactWriteItem[] = [];
  const products: ProductWithStock[] = [];


  const client = new SNSClient({});

  const db = new DynamoDB();
  const dbDocument = DynamoDBDocument.from(db);
  try {

    for (const msgs of event.Records) {
      const body = typeof msgs.body == "object"
      ? msgs.body
      : JSON.parse(msgs.body)

      const { title, description, price, count } = body;

      if (!title || !description || !price || !count) {
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

      const newProduct: Product = {
        id: randomUUID(),
        title,
        description,
        price,
      };

      const newStock: Stock = {
        product_id: newProduct.id,
        count,
      };

      products.push({ ...newProduct, count: newStock.count })

      const putProduct = {
        Put: {
          Item: marshall(newProduct),
          TableName: PRODUCTS,
        },
      };

      const putStock = {
        Put: {
          Item: marshall(newStock),
          TableName: STOCK,
        },
      };

      transactions.push(putProduct, putStock);
    }

    const transactCommand = new TransactWriteItemsCommand({
      TransactItems: transactions,
    });

    await dbDocument.send(transactCommand);

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
    console.log('Something went wrong:', e);

    return {
      statusCode: 500,
      headers: {
        ...getHeaders(),
        'Access-Control-Allow-Methods': 'GET',
      },
      body: JSON.stringify({ 
        message: `Something went wrong: ${e}`
      }),
    }

  }
  
};