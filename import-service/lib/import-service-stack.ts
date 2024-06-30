import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import { Construct } from 'constructs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'ImportServiceBucket', {
      bucketName: 'rs-liza-import-service-bucket',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const importProductsFileLambda = new lambda.Function(this, 'ImportProductsFileLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'importProductsFile.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        BUCKET: bucket.bucketName,
      },
    });

    bucket.grantReadWrite(importProductsFileLambda);
    bucket.grantPut(importProductsFileLambda);


    const api = new apigateway.RestApi(this, 'ImportServiceApi', {
      restApiName: 'Import Service',
      cloudWatchRole: true,
    });

    const importProducts = api.root.addResource('import');
    importProducts.addMethod('GET', new apigateway.LambdaIntegration(importProductsFileLambda));
  }
}

const app = new cdk.App();
new ImportServiceStack(app, 'ImportServiceStack');
