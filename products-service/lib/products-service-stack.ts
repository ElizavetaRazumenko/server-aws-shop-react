import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as eventsourses from 'aws-cdk-lib/aws-lambda-event-sources';
import { config } from 'dotenv';

config();
export class LizaProductsServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { PRODUCTS = '', STOCKS = '', EMAIL_1 = '', EMAIL_2 = '' } = process.env;

    const productsTable = dynamodb.Table.fromTableName(this, 'ImportedProductsTable', PRODUCTS) ||
            new dynamodb.Table(this, PRODUCTS, {
                tableName: PRODUCTS,
                partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
            });

    const stockTable = dynamodb.Table.fromTableName(this, 'ImportedStocksTable', STOCKS) ||
            new dynamodb.Table(this, STOCKS, {
                tableName: STOCKS,
                partitionKey: {name: 'product_id', type: dynamodb.AttributeType.STRING},
            });

    const topic = new sns.Topic(this, 'productTopicLiza', {
      topicName: 'productTopicLiza',
    });

    topic.addSubscription(
      new subscriptions.EmailSubscription(EMAIL_1, {
        filterPolicyWithMessageBody: {
          count: sns.FilterOrPolicy.filter(
            sns.SubscriptionFilter.numericFilter({ lessThan: 3 })
          ),
        },
      })
    );

    topic.addSubscription(
      new subscriptions.EmailSubscription(EMAIL_2, {
        filterPolicyWithMessageBody: {
          count: sns.FilterOrPolicy.filter(
            sns.SubscriptionFilter.numericFilter({ greaterThanOrEqualTo: 3 })
          ),
        },
      })
    );

    const lambdasEnvironment = {
      PRODUCTS: productsTable.tableName,
      STOCK: stockTable.tableName,
      SNS_TOPIC_ARN: topic.topicArn,
    }

    const getProductsListLambda = new lambda.Function(this, 'GetProductsListLambdaLiza', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsList.handler',
      environment: lambdasEnvironment
    });

    const getProductsByIdLambda = new lambda.Function(this, 'GetProductsByIdLambdaLiza', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsById.handler',
      environment: lambdasEnvironment
    });

    const createProductLambda = new lambda.Function(this, 'CreateProductLambdaLiza', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'createProduct.handler',
      environment: lambdasEnvironment
    });

    const catalogBatchProcessLambda = new lambda.Function(this, 'CatalogBatchProcessLambdaLiza', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'catalogBatchProcess.handler',
      environment: lambdasEnvironment
    });

    const catalogQueue = new sqs.Queue(this, 'CatalogQueueLiza', {
      queueName: 'CatalogQueueLiza',
      deadLetterQueue: { queue: new sqs.Queue(this, 'DeadLetterQueueLiza'), maxReceiveCount: 1 },
    });

    [productsTable, stockTable].forEach(table => {
      table.grantReadWriteData(getProductsListLambda)
      table.grantReadWriteData(getProductsByIdLambda)
      table.grantReadWriteData(createProductLambda)
      table.grantReadWriteData(catalogBatchProcessLambda)
    })


    topic.grantPublish(catalogBatchProcessLambda);
    catalogQueue.grantConsumeMessages(catalogBatchProcessLambda);

    catalogBatchProcessLambda.addEventSource(
      new eventsourses.SqsEventSource(catalogQueue, {
        batchSize: 5,
      })
    );


    const api = new apigateway.RestApi(this, 'ProductServiceApi', {
      restApiName: 'ProductService',
      defaultCorsPreflightOptions: {
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: apigateway.Cors.ALL_METHODS,
          allowHeaders: apigateway.Cors.DEFAULT_HEADERS
      }
    });

  const productsResource = api.root.addResource('products');

  const productModel = new apigateway.Model(this, 'CreateProductValidationModelLiza', {
    restApi: api,
    contentType: 'application/json',
    modelName: 'CreateProductValidationModelLiza',
    schema: {
      required: ['title', 'description', 'price', 'count'],
      type: apigateway.JsonSchemaType.OBJECT,
      properties: {
        title: { type: apigateway.JsonSchemaType.STRING },
        description: { type: apigateway.JsonSchemaType.STRING },
        price: { type: apigateway.JsonSchemaType.INTEGER },
        count: { type: apigateway.JsonSchemaType.INTEGER },
      },
    },
  });

  productsResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsListLambda));
  productsResource.addMethod('POST', new apigateway.LambdaIntegration(createProductLambda), {
    requestValidator: new apigateway.RequestValidator(
      this,
      'CreateProductBodyValidatorLiza',
      {
        restApi: api,
        requestValidatorName: 'CreateProductBodyValidatorLiza',
        validateRequestBody: true,
      }
    ),
    requestModels: {
      'application/json': productModel,
    },
  })

  const productByIdResource = productsResource.addResource('{id}');

  productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsByIdLambda));
  }
}
