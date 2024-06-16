import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Product } from '../types/types';

const availableProducts: Product[] = [
  {
    id: '1',
    title: 'Margherita Pizza',
    description: 'Classic pizza with tomato sauce, mozzarella, and basil.',
    price: 8.99,
    count: 10,
  },
  {
    id: '2',
    title: 'Pepperoni Pizza',
    description: 'Spicy pepperoni with mozzarella and tomato sauce.',
    price: 9.99,
    count: 15,
  },
  {
    id: '3',
    title: 'BBQ Chicken Pizza',
    description: 'Grilled chicken, BBQ sauce, red onions, and cilantro.',
    price: 11.99,
    count: 8,
  },
  {
    id: '4',
    title: 'Vegetarian Pizza',
    description: 'Mixed vegetables, mozzarella, and tomato sauce.',
    price: 9.49,
    count: 12,
  },
  {
    id: '5',
    title: 'Hawaiian Pizza',
    description: 'Ham, pineapple, mozzarella, and tomato sauce.',
    price: 10.49,
    count: 6,
  },
  {
    id: '6',
    title: 'Four Cheese Pizza',
    description: 'A blend of mozzarella, cheddar, parmesan, and blue cheese.',
    price: 10.99,
    count: 9,
  },
  {
    id: '7',
    title: 'Buffalo Chicken Pizza',
    description: 'Spicy buffalo chicken, mozzarella, and blue cheese dressing.',
    price: 12.49,
    count: 5,
  },
  {
    id: '8',
    title: 'Meat Lover\'s Pizza',
    description: 'Pepperoni, sausage, ham, bacon, and mozzarella.',
    price: 13.99,
    count: 7,
  },
  {
    id: '9',
    title: 'Mushroom Pizza',
    description: 'Fresh mushrooms, mozzarella, and garlic butter sauce.',
    price: 9.99,
    count: 10,
  },
  {
    id: '10',
    title: 'White Pizza',
    description: 'Ricotta, mozzarella, parmesan, garlic, and olive oil.',
    price: 11.49,
    count: 8,
  },
]

export class LizaProductsServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsListFunction = new lambda.Function(this, 'GetProductsListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsList.handler',
      environment: {
        PRODUCTS: JSON.stringify(availableProducts),
      }
    });

    const getProductsByIdFunction = new lambda.Function(this, 'GetProductsByIdFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsById.handler',
      environment: {
        PRODUCTS: JSON.stringify(availableProducts),
      }
    });

    const api = new apigateway.RestApi(this, 'ProductServiceApi', {
      restApiName: 'ProductService',
      defaultCorsPreflightOptions: {
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: apigateway.Cors.ALL_METHODS,
          allowHeaders: apigateway.Cors.DEFAULT_HEADERS
      }
  });

  const productsResource = api.root.addResource('products');

  productsResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsListFunction));

  const productByIdResource = productsResource.addResource('{id}');

  productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsByIdFunction));

  }
}
