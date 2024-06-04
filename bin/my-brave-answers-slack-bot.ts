#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MyBraveSlackBotStack } from '../lib/my-brave-answers-slack-bot-stack';
import { readFileSync } from 'fs';

export interface StackEnvironment {
  StackName: string;
  AWSRegion: string;
  ContextDaysToLive: string;
}

const app = new cdk.App();
const inputEnvFile = app.node.tryGetContext('environment');
if (inputEnvFile === undefined) {
  throw new Error('An input environment file is required');
}

const environment = JSON.parse(readFileSync(inputEnvFile).toString()) as StackEnvironment;
if (environment.AWSRegion === undefined) {
  throw new Error('AWSRegion is required');
}

new MyBraveSlackBotStack(
  app,
  'BraveSlackGatewayStack',
  {
    stackName: environment.StackName
  },
  environment
);
