import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { SecretsManager } from 'aws-sdk';
import { Block, ChatPostMessageResponse, ModalView, WebClient } from '@slack/web-api';
import { SlackEventsEnv } from '@functions/slack-event-handler';
import { makeLogger } from '@src/logging';
import { isEmpty } from '@src/utils';


const logger = makeLogger('slack-helpers');

let secretManagerClient: SecretsManager | null = null;

export const ERROR_MSG = '*_Processing error_*';
const getSecretManagerClient = (env: SlackEventsEnv) => {
  if (secretManagerClient === null) {
    secretManagerClient = new SecretsManager({ region: env.REGION });
  }

  return secretManagerClient;
};

export interface Secret {
  SlackClientId: string;
  SlackClientSecret: string;
  SlackBotUserOAuthToken: string;
  SlackBotUserRefreshToken?: string;
  SlackSigningSecret: string;
}

export const getUserInfo = async (env: SlackEventsEnv, user: string) => {
  const response = await (
    await getSlackClient(env)
  ).users.info({
    user
  });

  logger.debug(`getUsersInfo: ${JSON.stringify(response)}`);

  return response;
};

export const retrieveThreadHistory = async (
  env: SlackEventsEnv,
  channel: string,
  thread_ts: string
) => {
  const response = await (
    await getSlackClient(env)
  ).conversations.replies({
    channel,
    ts: thread_ts
  });

  logger.debug(`retrieveThreadHistory: ${JSON.stringify(response)}`);

  return response;
};

export const retrieveAttachment = async (
  env: SlackEventsEnv,
  url: string
) => {
  const secret = await getSlackSecret(env);
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${secret.SlackBotUserOAuthToken}`
    },
    responseType: 'arraybuffer' // Important for handling binary files
  });

  // log just enough of the attachment content to validate file contents when troubleshooting.
  logger.debug(
    `retrieveAttachment from ${url}: ${response.data
      .slice(0, 300)
      .toString()
      .replace(/\r?\n/g, '')}`
  );
  return response.data;
};

export const sendSlackMessage = async (
  env: SlackEventsEnv,
  channel: string,
  text: string,
  blocks?: Block[],
  thread_ts?: string
) => {
  const response = await (
    await getSlackClient(env)
  ).chat.postMessage({
    channel,
    blocks,
    text,
    thread_ts
  });

  logger.debug(`sendSlackMessage: ${JSON.stringify(response)}`);

  return response;
};

export const updateSlackMessage = async (
  env: SlackEventsEnv,
  postMessageResponse: ChatPostMessageResponse,
  text: string | undefined,
  blocks?: Block[]
) => {
  if (isEmpty(postMessageResponse.channel) || isEmpty(postMessageResponse.ts)) {
    logger.error(`Can't update message due to empty channel or ts`);
    return;
  }

  const response = await (
    await getSlackClient(env)
  ).chat.update({
    channel: postMessageResponse.channel,
    ts: postMessageResponse.ts,
    blocks,
    text
  });

  logger.debug(`updateSlackMessage: ${JSON.stringify(response)}`);
};

export const openModal = async (
  env: SlackEventsEnv,
  triggerId: string,
  channel: string,
  view: ModalView
) => {
  const response = await (
    await getSlackClient(env)
  ).views.open({
    trigger_id: triggerId,
    channel,
    view
  });

  logger.debug(JSON.stringify(response));
};
export const getMarkdownBlock = (content: string, imageUrl?: string) =>
  imageUrl !== undefined
    ? {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: content
        },
        accessory: {
          type: 'image',
          image_url: imageUrl,
          alt_text: ''
        }
      }
    : {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: content
        }
      };

export const getMarkdownBlocks = (content: string, imageUrl?: string): Block[] => [
  getMarkdownBlock(content, imageUrl)
];

export enum SLACK_ACTION {
  VIEW_SOURCES,
  FEEDBACK_DOWN,
  FEEDBACK_UP
}

export const createButton = (text: string, systemMessageId: string) => ({
  type: 'actions',
  elements: [
    {
      type: 'button',
      text: {
        type: 'plain_text',
        text,
        emoji: true
      },
      style: 'primary',
      value: systemMessageId,
      action_id: SLACK_ACTION[SLACK_ACTION.VIEW_SOURCES]
    }
  ]
});

const getSlackClient = async (env:  SlackEventsEnv) => {
  const secret = await getSlackSecret(env);
  return new WebClient(secret.SlackBotUserOAuthToken);
};

export const getSlackSecret = async (
  env: SlackEventsEnv
): Promise<Secret> => {
  logger.debug(`Getting secret value for SecretId ${env.SLACK_SECRET_NAME}`);
  const secret = await getSecretManagerClient(env)
    .getSecretValue({
      SecretId: env.SLACK_SECRET_NAME
    })
    .promise();

  if (secret.SecretString === undefined) {
    throw new Error('Missing SecretString');
  }

  return JSON.parse(secret.SecretString);
};

export const validateSlackRequest = async (
  headers: { [key: string]: string | undefined },
  encodedBody: string,
  env: SlackEventsEnv,
  dependencies = {
    getSlackSecret
  }
): Promise<boolean> => {
  const secret = await dependencies.getSlackSecret(env);

  const isValid = verifySlackSignature(headers, encodedBody, secret.SlackSigningSecret);
  if (!isValid) {
    logger.warn(
      `Invalid signature for request, signature ${headers['X-Slack-Signature'] ?? 'undefined'}`
    );
  }
  return isValid;
};

export const verifySlackSignature = (
  headers: { [key: string]: string | undefined },
  encodedBody: string,
  slackSigningSecret: string,
  date = new Date()
) => {
  if (
    headers['X-Slack-Request-Timestamp'] === undefined ||
    headers['X-Slack-Signature'] === undefined
  ) {
    return false;
  }
  const slackRequestTimestamp = parseInt(headers['X-Slack-Request-Timestamp']);
  const delta = date.getTime() / 1000 - slackRequestTimestamp;
  if (delta > 60 * 5) {
    return false;
  }

  const toSign = `v0:${slackRequestTimestamp}:${encodedBody}`;
  const hmacSig = `v0=${createHmac('sha256', slackSigningSecret).update(toSign).digest('hex')}`;

  return timingSafeEqual(Buffer.from(headers['X-Slack-Signature']), Buffer.from(hmacSig));
};
