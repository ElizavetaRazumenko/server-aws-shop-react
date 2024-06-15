import { Product } from "../types/types";
import { getHeaders } from "./helpers";

export const handler = async () => {
  const products: Product[] = JSON.parse(process.env.PRODUCTS || '[]');

  return {
    statusCode: 200,
    headers: getHeaders(),
    body: JSON.stringify(products),
  }
};