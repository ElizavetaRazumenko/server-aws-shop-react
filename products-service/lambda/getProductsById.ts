import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { getHeaders } from './helpers';

const dynamoDb = DynamoDBDocument.from(new DynamoDB({ region: 'eu-central-1' }));

const { PRODUCTS, STOCK } = process.env;

export const handler = async (event: APIGatewayProxyEvent) => {
    const productId = event.pathParameters?.id;

    console.log('Get product id: ', productId);

    if (!productId) {
      console.log('Product ID is required');

      return {
        statusCode: 400,
        headers: getHeaders(),
        body: JSON.stringify({
          message: "Product ID is required"
        })
      }
    }

    try {
      const productResult = await dynamoDb.get({
        TableName: PRODUCTS!,
        Key: { id: productId },
      });

      const product = productResult.Item;

      const stockResult = await dynamoDb.get({
        TableName: STOCK!,
        Key: { product_id: productId },
      });

      const stock = stockResult.Item;

      if (product && stock) {
        const productWithStock = {
          ...product,
          count: stock ? stock.count : 0,
        };
  
        console.log('Return product with id: ', productId);
  
        return {
          statusCode: 200,
          headers: getHeaders(),
          body: JSON.stringify(productWithStock),
        };
      } else {
        console.log('Product with id: ', productId, ' doesn\'t exist');

        return {
          statusCode: 404,
          headers: getHeaders(),
          body: JSON.stringify({
            message: "Product not found"
          })
        };
      }
      
    } catch (e) {
      console.log('Failed to get product: ', e);

      return {
        statusCode: 500,
        headers: getHeaders(),
        body: JSON.stringify({ error: 'Failed to get product' }),
      };
    }
};
