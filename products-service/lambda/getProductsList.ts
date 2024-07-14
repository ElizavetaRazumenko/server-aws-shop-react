import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { Product, ProductWithStock, Stock } from '../types/types';
import { getHeaders } from './helpers';
import { APIGatewayEvent } from "aws-lambda";

const dynamoDb = DynamoDBDocument.from(new DynamoDB({ region: 'eu-central-1' }));

const { PRODUCTS, STOCK } = process.env;

export const handler = async () => {
  console.log('Get all products handler');

  try {
    const productsResult = await dynamoDb.scan({ TableName: PRODUCTS! });
    const products = productsResult.Items as Product[];

    const stocksResult = await dynamoDb.scan({ TableName: STOCK! });
    const stocks = stocksResult.Items as Stock[];

    const productsWithStock: ProductWithStock[] = products!.map((product) => {
      const stock = stocks!.find(s => s.product_id === product.id);
      return {
        ...product,
        count: stock ? stock.count : 0
      };
    });

    console.log('GET request for Product list was received');

    return {
      statusCode: 200,
      headers: getHeaders(),
      body: JSON.stringify(productsWithStock),
    };
  } catch (e) {
    console.log('Failed to get products list: ', e);

    return {
      statusCode: 500,
      headers: getHeaders(),
      body: JSON.stringify({ error: 'Failed to get products' }),
    };
  }
};
