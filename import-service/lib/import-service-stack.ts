import * as cdk from 'aws-cdk-lib';
import * as dotenv from "dotenv";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import { Construct } from 'constructs';
import * as s3notifications from "aws-cdk-lib/aws-s3-notifications";

dotenv.config();

export class ImportServiceStackLiza extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketName = process.env.BUCKET || "";

    const bucket = s3.Bucket.fromBucketName(
      this,
      "LizaImportServiceBucket",
      bucketName
    );

    const importProductsFileLambda = new lambda.Function(this, 'LizaImportProductsFileLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'importProductsFile.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        BUCKET: bucket.bucketName,
      },
    });

    const importFileParserLambda = new lambda.Function(
      this,
      "LizaImportFileParserLambda ",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "importProductsFile.handler",
        code: lambda.Code.fromAsset('lambda'),
        environment: {
          BUCKET: bucket.bucketName,
        },
      }
    );

    bucket.grantReadWrite(importProductsFileLambda);
    bucket.grantReadWrite(importFileParserLambda);
    bucket.grantDelete(importFileParserLambda);

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

    const importProducts = api.root.addResource("import");

    importProducts.addMethod("GET", new apigateway.LambdaIntegration(importProductsFileLambda), {
      requestParameters: {
        "method.request.querystring.name": true,
      },
      requestValidatorOptions: {
        validateRequestParameters: true,
      },
    });
  }
}
