import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class LizaProductsServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTableName = 'products_liza'
    const stocksTableName = 'stocks_liza'

    const productsTable = dynamodb.Table.fromTableName(this, 'ImportedProductsTable', productsTableName) ||
            new dynamodb.Table(this, productsTableName, {
                partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
                tableName: productsTableName,
            });

    const stockTable = dynamodb.Table.fromTableName(this, 'ImportedStocksTable', stocksTableName) ||
            new dynamodb.Table(this, stocksTableName, {
                partitionKey: {name: 'product_id', type: dynamodb.AttributeType.STRING},
                tableName: stocksTableName,
            });

    const lambdasEnvironment = {
      PRODUCTS: productsTable.tableName,
      STOCK: stockTable.tableName
    }

    const getProductsListFunction = new lambda.Function(this, 'GetProductsListFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsList.handler',
      environment: lambdasEnvironment
    });

    const getProductsByIdFunction = new lambda.Function(this, 'GetProductsByIdFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsById.handler',
      environment: lambdasEnvironment
    });

    const createProductFunction = new lambda.Function(this, 'CreateProductFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'createProduct.handler',
      environment: lambdasEnvironment
  });

    [productsTable, stockTable].forEach(table => {
      table.grantReadData(getProductsListFunction)
      table.grantReadData(getProductsByIdFunction)
      table.grantWriteData(createProductFunction)
})


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
  productsResource.addMethod('POST', new apigateway.LambdaIntegration(createProductFunction))

  const productByIdResource = productsResource.addResource('{id}');

  productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsByIdFunction));

  }
}
