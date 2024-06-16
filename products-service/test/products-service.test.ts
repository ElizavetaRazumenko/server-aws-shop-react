import { handler as getProductListHandler } from '../lambda/getProductsList';
import { handler as getProductsById } from '../lambda/getProductsById';
import { mockProducts } from './mock-data';
import { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('../lambda/helpers', () => ({
  getHeaders: jest.fn(() => ({ 'Content-Type': 'application/json' })),
}));


describe('getProductsById handler', () => {
     beforeEach(() => {
        process.env.PRODUCTS = JSON.stringify(mockProducts);
    });

    afterEach(() => {
        delete process.env.PRODUCTS;
    });

    it('should return the product if productId is found', async () => {
      const event = { pathParameters: { id: '1' } } as unknown as APIGatewayProxyEvent;
  
      const result = await getProductsById(event);
  
      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(result.body).toBe(JSON.stringify(mockProducts[0]));
    });
  
    it('should return 404 if product is not found', async () => {
      const event = { pathParameters: { id: 'non-existent' } } as unknown as APIGatewayProxyEvent;
  
      const result = await getProductsById(event);
  
      expect(result.statusCode).toBe(404);
      expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(result.body).toBe(JSON.stringify({ message: 'Product not found' }));
    });

    it('should return 404 if product is not found', async () => {
      const event = { pathParameters: { id: 'non-existent' } } as unknown as APIGatewayProxyEvent;
  
      const result = await getProductsById(event);
  
      expect(result.statusCode).toBe(404);
      expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(result.body).toBe(JSON.stringify({ message: 'Product not found' }));
    });

});


describe('getProducts handler', () => {
  beforeAll(() => {
    process.env.PRODUCTS = JSON.stringify(mockProducts);
  });

  afterAll(() => {
    delete process.env.PRODUCTS;
  });

  it('should return 200 and the list of products', async () => {
    const result = await getProductListHandler();

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(result.body).toBe(JSON.stringify(mockProducts));
  });

  it('should return 200 and an empty list if no products are available', async () => {
    delete process.env.PRODUCTS;

    const result = await getProductListHandler();

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(result.body).toBe(JSON.stringify([]));
  });
});
