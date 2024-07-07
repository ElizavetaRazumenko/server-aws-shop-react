import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as eventsourses from "aws-cdk-lib/aws-lambda-event-sources";

export class LizaProductsServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTableName = 'products_liza';
    const stocksTableName = 'stocks_liza';
    const email_1 = 'razumenko99@mail.ru';
    const email_2 = 'elizaveta.razumenko@pargoo.com';

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

    const createProductTopic = new sns.Topic(this, "createProductTopicLiza", {
      topicName: "createProductTopicLiza",
    });

    // createProductTopic.addSubscription(
    //   new subscriptions.EmailSubscription(email)
    // );

    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription(email_1, {
        filterPolicyWithMessageBody: {
          count: sns.FilterOrPolicy.filter(
            sns.SubscriptionFilter.numericFilter({ greaterThanOrEqualTo: 3 })
          ),
        },
      })
    );

    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription(email_2, {
        filterPolicyWithMessageBody: {
          count: sns.FilterOrPolicy.filter(
            sns.SubscriptionFilter.numericFilter({ lessThan: 3 })
          ),
        },
      })
    );

    const lambdasEnvironment = {
      PRODUCTS: productsTable.tableName,
      STOCK: stockTable.tableName,
      SNS_TOPIC_ARN: createProductTopic.topicArn,
    }

    const getProductsListFunction = new lambda.Function(this, 'GetProductsListFunctionLiza', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsList.handler',
      environment: lambdasEnvironment
    });

    const getProductsByIdFunction = new lambda.Function(this, 'GetProductsByIdFunctionLiza', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsById.handler',
      environment: lambdasEnvironment
    });

    const createProductFunction = new lambda.Function(this, 'CreateProductFunctionLiza', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'createProduct.handler',
      environment: lambdasEnvironment
    });

    const catalogBatchProcessFunction = new lambda.Function(this, 'CatalogBatchProcessFunctionLiza', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'catalogBatchProcess.handler',
      environment: lambdasEnvironment
    });

    const deadLetterQueue = new sqs.Queue(this, "DeadLetterQueueLiza");

    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueueLiza", {
      queueName: "CatalogItemsQueueLiza",
      deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 1 },
    });

    createProductTopic.grantPublish(catalogBatchProcessFunction);


    [productsTable, stockTable].forEach(table => {
      table.grantReadWriteData(getProductsListFunction)
      table.grantReadWriteData(getProductsByIdFunction)
      table.grantReadWriteData(createProductFunction)
      table.grantReadWriteData(catalogBatchProcessFunction)
    })

    catalogItemsQueue.grantConsumeMessages(catalogBatchProcessFunction);

    catalogBatchProcessFunction.addEventSource(
      new eventsourses.SqsEventSource(catalogItemsQueue, {
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

  const productModel = new apigateway.Model(this, "CreateProductValidationModelLiza", {
    restApi: api,
    contentType: "application/json",
    modelName: "CreateProductValidationModelLiza",
    schema: {
      type: apigateway.JsonSchemaType.OBJECT,
      required: ["title", "description", "price", "count"],
      properties: {
        title: { type: apigateway.JsonSchemaType.STRING },
        description: { type: apigateway.JsonSchemaType.STRING },
        price: { type: apigateway.JsonSchemaType.INTEGER },
        count: { type: apigateway.JsonSchemaType.INTEGER },
      },
    },
  });

  productsResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsListFunction));
  productsResource.addMethod('POST', new apigateway.LambdaIntegration(createProductFunction), {
    requestValidator: new apigateway.RequestValidator(
      this,
      "CreateProductBodyValidatorLiza",
      {
        restApi: api,
        requestValidatorName: "CreateProductBodyValidatorLiza",
        validateRequestBody: true,
      }
    ),
    requestModels: {
      "application/json": productModel,
    },
  })

  const productByIdResource = productsResource.addResource('{id}');

  productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsByIdFunction));

  }
}
