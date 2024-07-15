import * as cdk from 'aws-cdk-lib';
import * as dotenv from "dotenv";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import { Construct } from 'constructs';
import * as s3notifications from "aws-cdk-lib/aws-s3-notifications";
import * as sqs from "aws-cdk-lib/aws-sqs";

dotenv.config();

export class ImportServiceStackLiza extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const BUCKET = process.env.BUCKET || "";
    const SQS_ARN = process.env.SQS_ARN ?? "";
    const AUTHORIZER_LAMBDA_ARN = process.env.AUTHORIZER_LAMBDA_ARN ?? "";

    const bucket = s3.Bucket.fromBucketName(
      this,
      "LizaImportServiceBucket",
      BUCKET
    );

    const catalogQueue = sqs.Queue.fromQueueArn(
      this,
      "CatalogQueueLiza",
      SQS_ARN
    );

    const lambdasEnvironment = {
      BUCKET: bucket.bucketName,
      SQS_URL: catalogQueue.queueUrl
    }

    const importProductsFileLambda = new lambda.Function(this, 'LizaImportProductsFileLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'importProductsFile.handler',
      environment: lambdasEnvironment,
    });

    const importFileParserLambda = new lambda.Function(
      this,
      "LizaImportFileParserLambda ",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset('lambda'),
        handler: "importFileParser.handler",
        environment: lambdasEnvironment,
      }
    );

    const authorizerLambda = lambda.Function.fromFunctionAttributes(this, 'AuthorizerLambdaLiza', {
      functionArn: AUTHORIZER_LAMBDA_ARN, sameEnvironment: true
    });

    bucket.grantReadWrite(importProductsFileLambda);
    bucket.grantReadWrite(importFileParserLambda);
    bucket.grantDelete(importFileParserLambda);

    catalogQueue.grantSendMessages(importFileParserLambda);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3notifications.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" }
    );


    const api = new apigateway.RestApi(this, 'LizaImportServiceApi', {
      restApiName: 'Import Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    api.addGatewayResponse("ImportServiceDefault4xx", {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
      },
    });

    const importResource = api.root.addResource("import");

    const requestAuthorizer = new apigateway.RequestAuthorizer(this, "RequestAuthorizerLiza", {
      handler: authorizerLambda,
      identitySources: [apigateway.IdentitySource.header("Authorization")],
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    importResource.addMethod("GET", new apigateway.LambdaIntegration(importProductsFileLambda), {
      requestParameters: {
        "method.request.querystring.name": true,
      },
      requestValidatorOptions: {
        validateRequestParameters: true,
      },
      authorizer: requestAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
  }
}
