import * as cdk from 'aws-cdk-lib';
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { config } from "dotenv";
import { Construct } from 'constructs';


config();

export class AuthorizationServiceStackLiza extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const elizavetarazumenko = process.env.elizavetarazumenko ?? '';

    const lambdasEnvironment = {
      elizavetarazumenko,
    }

    const basicAuthorizer = new lambda.Function(this, "AuthorizerHandlerLambdaLiza",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset('lambda'),
        handler: 'basicAuthorizer.handler',
        environment: lambdasEnvironment
      }
    );
  }
}
