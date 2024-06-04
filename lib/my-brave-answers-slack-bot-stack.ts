import * as cdk from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import {
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal
} from 'aws-cdk-lib/aws-iam';
import { StackEnvironment } from '../bin/my-brave-answers-slack-bot';

import * as fs from 'fs';
const packageJson = fs.readFileSync('package.json', 'utf-8');
const version = JSON.parse(packageJson).version;
const STACK_DESCRIPTION = `Brave Slack Gateway - v${version}`;

export class MyBraveSlackBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps, env: StackEnvironment) {
    super(scope, id, {
      ...props,
      description: STACK_DESCRIPTION
    });

    // Reference the AWS::StackName directly
    const refStackName = cdk.Fn.ref('AWS::StackName');

    const vpc = new Vpc(this, `${props.stackName}-VPC`,{
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 1,
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: 'private-subnet-1',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'public-subnet-1',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });
    const initialSecretContent = JSON.stringify({
      SlackSigningSecret: '<Replace with Signing Secret>',
      SlackBotUserOAuthToken: '<Replace with Bot User OAuth Token>',
    });
    const slackSecret = new Secret(this, `${props.stackName}-Secret`, {
      secretName: `${refStackName}-Secret`,
      secretStringValue: cdk.SecretValue.unsafePlainText(initialSecretContent)
    });
    // Output URL to the secret in the AWS Management Console
    new CfnOutput(this, 'SlackSecretConsoleUrl', {
      value: `https://${this.region}.console.aws.amazon.com/secretsmanager/secret?name=${slackSecret.secretName}&region=${this.region}`,
      description: 'Click to edit the Slack secrets in the AWS Secrets Manager console'
    });

    const initialBraveSecretContent = JSON.stringify({
      BraveAPIKey: '<Replace with Brave API Key>'
    });
    const braveSecret = new Secret(this, `${props.stackName}-Brave-Secret`, {
      secretName: `${refStackName}-Brave-Secret`,
      secretStringValue: cdk.SecretValue.unsafePlainText(initialBraveSecretContent)
    });
    // Output URL to the secret in the AWS Management Console
    new CfnOutput(this, 'BraveSecretConsoleUrl', {
      value: `https://${this.region}.console.aws.amazon.com/secretsmanager/secret?name=${braveSecret.secretName}&region=${this.region}`,
      description: 'Click to edit the Brave secrets in the AWS Secrets Manager console'
    });

    const dynamoCache = new Table(this, `${props.stackName}-DynamoCache`, {
      tableName: `${refStackName}-channels-metadata`,
      partitionKey: {
        name: 'channel',
        type: AttributeType.STRING
      },
      timeToLiveAttribute: 'expireAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const messageMetadata = new Table(this, `${props.stackName}-MessageMetadata`, {
      tableName: `${refStackName}-responses-metadata`,
      partitionKey: {
        name: 'messageId',
        type: AttributeType.STRING
      },
      timeToLiveAttribute: 'expireAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    [
      {
        handler: 'slack-event-handler',
        id: 'SlackEventHandler',
        description: 'Handler for Slack events'
      },
      {
        handler: 'slack-command-handler',
        id: 'SlackCommandHandler',
        description: 'Handler for Slack commands'
      }
    ].map((p) => {
      const prefix = `${props.stackName}-${p.id}`;
      new LambdaRestApi(this, `${prefix}-Api`, {
        // Keep dynamic description (with date) to ensure api is deployed on update to new template
        description: `${p.description}, Revision: ${new Date().toISOString()})`,
        deploy: true,
        handler: new lambda.NodejsFunction(this, `${prefix}-Fn`, {
          functionName: `${refStackName}-${p.id}`,
          entry: `src/functions/${p.handler}.ts`,
          handler: `handler`,
          description: `${p.description}, Revision: ${new Date().toISOString()})`,
          timeout: Duration.seconds(30),
          environment: {
            SLACK_SECRET_NAME: slackSecret.secretName,
            BRAVE_SECRET_NAME: braveSecret.secretName,
            CONTEXT_DAYS_TO_LIVE: env.ContextDaysToLive,
            CACHE_TABLE_NAME: dynamoCache.tableName,
            MESSAGE_METADATA_TABLE_NAME: messageMetadata.tableName,
          },
          role: new Role(this, `${prefix}-Role`, {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
              ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
            ],
            inlinePolicies: {
              SecretManagerPolicy: new PolicyDocument({
                statements: [
                  new PolicyStatement({
                    actions: ['secretsmanager:GetSecretValue'],
                    resources: [slackSecret.secretArn, braveSecret.secretArn]
                  })
                ]
              }),
              DynamoDBPolicy: new PolicyDocument({
                statements: [
                  new PolicyStatement({
                    actions: ['dynamodb:DeleteItem', 'dynamodb:PutItem', 'dynamodb:GetItem'],
                    resources: [dynamoCache.tableArn, messageMetadata.tableArn]
                  })
                ]
              }),
            }
          }),
          vpc,
          vpcSubnets: {
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          },
        })
      });
    });
  }
}
