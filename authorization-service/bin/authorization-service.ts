#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthorizationServiceStackLiza } from '../lib/authorization-service-stack';

const app = new cdk.App();
new AuthorizationServiceStackLiza(app, 'AuthorizationServiceStackLiza', {
});