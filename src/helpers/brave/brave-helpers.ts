import { makeLogger } from '@src/logging';
import { SecretsManager } from 'aws-sdk';
import { SlackEventsEnv } from '@functions/slack-event-handler';
import { isEmpty } from '@src/utils';
import { createButton, getMarkdownBlock } from '@helpers/slack/slack-helpers';
import fetch, { Headers } from 'node-fetch';
import { SectionBlock, Block, HeaderBlock, DividerBlock } from '@slack/web-api';

const logger = makeLogger('brave-helpers');
export const ERROR_MSG = '*_Processing error_*';
let secretManagerClient: SecretsManager | null = null;

export interface Secret {
  BraveAPIKey: string;
}

export interface BraveClientInterface {
  getSecret (env: SlackEventsEnv): void;
  getSummary (key:String): Promise<SummarizerSearchApiResponse | Error>;
  getSearch (query:String): Promise<WebSearchApiResponse | Error>;

}

export class BraveClient implements BraveClientInterface {

  secret: Secret | null = null

  getSecret = async (env: SlackEventsEnv) => {
    if (this.secret == null) {
      this.secret = await getBraveSecret(env);
    }
  }

  getSummary = async (
    key: string
  ): Promise<SummarizerSearchApiResponse | Error> => {
    try {

      if (this.secret === undefined || this.secret?.BraveAPIKey === undefined) {
        throw new Error('Missing Brave API Key');
      }
      logger.debug(`Initiating Brave Summarizer API Call}`);
      const headers: Headers = new Headers()
      headers.set('Accept', 'application/json')
      headers.set('X-Subscription-Token', this.secret.BraveAPIKey)

      return fetch(`https://api.search.brave.com/res/v1/summarizer/search?key=${key}`, {
        method: 'GET',
        headers: headers,
      })
        .then(res => res.json())
        .then(res => {
          logger.debug(`Brave summarizer response: ${JSON.stringify(res)}`);
          return res as SummarizerSearchApiResponse
        })

    } catch (error) {
      logger.error(`Caught Exception: ${JSON.stringify(error)}`);
      if (error instanceof Error) {
        return new Error(error.message);
      } else {
        return new Error(`${JSON.stringify(error)}`);
      }
    }
  };

  getSearch = async (
    query: string,
  ): Promise<WebSearchApiResponse | Error> => {
    try {
      if (this.secret === undefined || this.secret?.BraveAPIKey === undefined) {
        throw new Error('Missing Brave API Key');
      }
      logger.debug(`Initiating Brave Search API Call, creating headers`);
      const headers: Headers = new Headers()
      headers.set('Accept', 'application/json')
      headers.set('X-Subscription-Token', this.secret.BraveAPIKey)

      return fetch(`https://api.search.brave.com/res/v1/web/search?q=${query.trim().replace(" ", "+")}&summary=1`, {
        method: 'GET',
        headers: headers,
      })
        .then(res => res.json())
        .then(res => {
          logger.debug(`Brave search response: ${JSON.stringify(res)}`);
          return res as WebSearchApiResponse
        })
        .catch(error => {
          logger.error(`fetch Brave Search Exception: ${JSON.stringify(error)}`);
          return error;
        });

    } catch (error) {
      logger.error(`Caught Brave Search Exception: ${JSON.stringify(error)}`);
      if (error instanceof Error) {
        return new Error(error.message);
      } else {
        return new Error(`${JSON.stringify(error)}`);
      }
    }
  };

}

const getSecretManagerClient = (env: SlackEventsEnv) => {
  if (secretManagerClient === null) {
    secretManagerClient = new SecretsManager({ region: env.REGION });
  }

  return secretManagerClient;
};

export const getBraveSecret = async (
  env: SlackEventsEnv
): Promise<Secret> => {
  logger.debug(`Getting Brave secret value for SecretId ${env.BRAVE_SECRET_NAME}`);
  const secret = await getSecretManagerClient(env)
    .getSecretValue({
      SecretId: env.BRAVE_SECRET_NAME
    })
    .promise();

  if (secret.SecretString === undefined) {
    throw new Error('Missing SecretString');
  }

  return JSON.parse(secret.SecretString);
};


export const getResponseAsBlocks = (response: SummarizerSearchApiResponse) => {
  if (isEmpty(response.summary)) {
    return [];
  }

  const title: HeaderBlock = {
    type: 'header',
    text: {
      type: 'plain_text',
      text: response.title
    }
  }

  const divider: DividerBlock = {
    type: 'divider',
  }

  return [title,...(response.summary.map((summary) => getMarkdownBlock(convertBold(summary.data)))),divider,
  ...(!isEmpty(response.enrichments.context) ? getContextSection(response.enrichments.context)
    : [])];

};

export const getContextSection = (contexts: SummaryContext[]): Block[] => {
  const header: HeaderBlock = {
    type: 'header',
    text: {
      type: 'plain_text',
      text: 'Context'
    }
  }
  return [header, ...getContextBlocks(contexts)]
}

export const getContextBlocks = (contexts: SummaryContext[]): SectionBlock[] => contexts.map((c) => {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `<${c.url}|${c.title}>`
    }
  }
});

export const convertBold = (content: string) =>
  content.replace(/\*\*/g, '*');

export interface SummarizerSearchApiResponse {
  type: string;
  status: string;
  title: string;
  summary: SummaryMessage[];
  enrichments: SummaryEnrichments;
  followups: string[];
}

export interface WebSearchApiResponse {
  type: string;
  summarizer: Summarizer;
}

export interface SummaryMessage {
  type: string;
  data: string;
}

export interface SummaryEnrichments {
  raw: string;
  images: SummaryImage[];
  qa: SummaryAnswer[];
  entities: SummaryEntity[];
  context: SummaryContext[];
}

export interface SummaryContext {
  title: string;
  url: string;
  meta_url: MetaUrl;
}

export interface SummaryEntity {
  uuid: string;
  name: string;
  url: string;
  text?: string;
  images: SummaryImage[];
  highlight: TextLocation[];
}

export interface SummaryAnswer {
  answer: string;
  score?: number;
  highlight: TextLocation;
}

export interface SummaryImage {
  text?: string;
}

export interface SummarizerResult {
  type: string;
  summary: string;
  answer: SummarizerAnswer;
  references: ReferenceSource[];
}

export interface ReferenceSource {
  type: string;
  name: string;
  url: string;
  img: string;
  locations: TextLocation[];
}

export interface SummarizerAnswer {
  text: string;
  location: TextLocation;
}

export interface TextLocation {
  start: number;
  end: number;
}

export interface SummaryEntityInfoDict {
  key: string;
  value: SummaryEntityInfo[];
}

export interface SummaryEntityInfo {
  provider: string;
  description: string;
}

export interface FAQ {
  type: string;
  results: QA[];
}

export interface QA {
  question?: string;
  answer?: string;
  title?: string;
  url?: string;
  meta_url?: MetaUrl;
}

export interface MetaUrl {
  scheme?: string;
  netloc?: string;
  hostname?: string;
  favicon?: string;
  path?: string;
}

export interface Discussions {
  type: string;
  results: DiscussionResult[];
  mutated_by_goggles: boolean;
}

export interface DiscussionResult {
  type: string;
  data: ForumData;
}

export interface ForumData {
  forum_name: string;
  num_answers: number;
  score: string;
  title: string;
  question?: string;
  top_comment: string;
}

export interface Summarizer {
  type: string;
  key: string;
}


