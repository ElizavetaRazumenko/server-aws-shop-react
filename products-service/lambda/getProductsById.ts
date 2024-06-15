import { APIGatewayProxyEvent } from 'aws-lambda';
import { Product } from '../types/types';
import { getHeaders } from './helpers';

export const handler = async (event: APIGatewayProxyEvent) => {
    const productId = event.pathParameters?.id;

    if (!productId) {
      return {
        statusCode: 400,
        headers: getHeaders(),
        body: JSON.stringify({
          message: "Product ID is required"
        })
      }
    }

    const products: Product[] = JSON.parse(process.env.PRODUCTS || '[]');
    const product = products.find((product) => product.id === productId);

    if (product) {
      return {
        statusCode: 200,
        headers: getHeaders(),
        body: JSON.stringify(product),
      }
    }

    return {
      statusCode: 404,
      headers: getHeaders(),
      body: JSON.stringify({
        message: "Product not found"
      })
    }
};