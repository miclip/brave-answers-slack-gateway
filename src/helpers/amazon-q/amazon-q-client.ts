import { SlackEventsEnv } from '@functions/slack-event-handler';
import { SlackInteractionsEnv } from '@functions/slack-interaction-handler';

import { Attachment, ChatResponse } from '@helpers/chat';
import { makeLogger } from '@src/logging';
import { v4 as uuid } from 'uuid';

// I am not happy about this but we must to do as those types are not yet available in CDK
/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-explicit-any: "off" */
const AWS = require('aws-sdk');
const logger = makeLogger('amazon-q-client');

export interface AmazonQResponse extends ChatResponse {
  conversationId: string;
  systemMessageId: string;
  userMessageId: string;
  sourceAttributions?: SourceAttribution[];
}

export interface SourceAttribution {
  title?: string;
  snippet?: string;
  url?: string;
  citationNumber?: number;
  updatedAt?: string;
  textMessageSegments?: TextSegment[];
}

export interface TextSegment {
  beginOffset?: number;
  endOffset?: number;
}

export const initAmazonQSDK = () => {
  AWS.apiLoader.services.expertq = {};
  AWS.ExpertQ = AWS.Service.defineService('expertq', ['2023-11-27']);
  Object.defineProperty(AWS.apiLoader.services.expertq, '2023-11-27', {
    get: function get() {
      const model = require('./amazon-q.json');
      model.paginators = {};
      return model;
    },
    enumerable: true,
    configurable: true
  });
};

let amazonQClient: unknown = null;
export const getClient = (env: SlackEventsEnv) => {
  if (amazonQClient === null) {
    initAmazonQSDK();
    logger.debug(
      `Initiating AmazonQ client with region ${env.AMAZON_Q_REGION} and endpoint ${env.AMAZON_Q_ENDPOINT}`
    );
    amazonQClient = new AWS.ExpertQ({
      region: env.AMAZON_Q_REGION,
      endpoint: env.AMAZON_Q_ENDPOINT
    });
  }

  return amazonQClient;
};

export const callClient = async (
  message: string,
  attachments: Attachment[],
  env: SlackEventsEnv,
  context?: {
    conversationId: string;
    parentMessageId: string;
  }
): Promise<AmazonQResponse> => {
  const input = {
    applicationId: env.AMAZON_Q_APP_ID,
    userId: env.AMAZON_Q_USER_ID,
    clientToken: uuid(),
    userMessage: message,
    ...(attachments.length > 0 && { attachments }),
    ...context
  };

  logger.debug(`callClient input ${JSON.stringify(input)}`);
  return await (getClient(env) as any).chatSync(input).promise();
};

export const submitFeedbackRequest = async (
  env: SlackInteractionsEnv,
  context: {
    conversationId: string;
    messageId: string;
  },
  usefulness: 'USEFUL' | 'NOT_USEFUL',
  reason: 'HELPFUL' | 'NOT_HELPFUL',
  submittedAt: string
): Promise<void> => {
  const input = {
    applicationId: env.AMAZON_Q_APP_ID,
    userId: env.AMAZON_Q_USER_ID,
    ...context,
    messageUsefulness: {
      usefulness: usefulness,
      reason: reason,
      submittedAt: Number(submittedAt)
    }
  };

  logger.debug(`putFeedbackRequest input ${JSON.stringify(input)}`);
  const response = await (getClient(env) as any).putFeedback(input).promise();
  logger.debug(`putFeedbackRequest output ${JSON.stringify(response)}`);

  return response;
};
