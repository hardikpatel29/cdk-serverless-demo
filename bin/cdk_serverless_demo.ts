#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkServerlessDemoStack } from '../lib/cdk_serverless_demo-stack';
import environmentConfig from './configs';

const app = new cdk.App();
new CdkServerlessDemoStack(app, 'CdkServerlessDemoStack', environmentConfig);