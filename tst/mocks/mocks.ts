import { HttpResponse } from 'aws-sdk';
import braveSummaryValidResponse from '@tst/mocks/brave/valid-summary-response-1.json';
import braveSearchValidResponse from '@tst/mocks/brave/valid-search-response-1.json';
import { BraveClientInterface, SummarizerSearchApiResponse, WebSearchApiResponse, getResponseAsBlocks } from '@src/helpers/brave/brave-helpers';

export const MOCK_ENV = {
  SLACK_SECRET_NAME: 'SLACK_SECRET_NAME',
  REGION: 'REGION',
  AMAZON_Q_ENDPOINT: 'AMAZON_Q_ENDPOINT',
  AMAZON_Q_APP_ID: 'AMAZON_Q_APP_ID',
  AMAZON_Q_USER_ID: 'AMAZON_Q_USER_ID',
  CONTEXT_DAYS_TO_LIVE: 'N',
  CACHE_TABLE_NAME: `CACHE_TABLE_NAME`,
  AMAZON_Q_REGION: 'AMAZON_Q_REGION',
  MESSAGE_METADATA_TABLE_NAME: 'MESSAGE_METADATA_TABLE_NAME',
  BRAVE_SECRET_NAME: 'BRAVE_SECRET_NAME'
};

/* eslint @typescript-eslint/no-explicit-any: "off" */
export const MOCK_AWS_RESPONSE = {
  $response: {
    hasNextPage: () => false,
    nextPage: () => ({}) as any,
    data: {},
    error: undefined,
    requestId: 'requestId',
    redirectCount: 0,
    retryCount: 0,
    httpResponse: {} as HttpResponse
  }
};



export class BraveClientMock implements BraveClientInterface {
  getSecret(env: { REGION: string; SLACK_SECRET_NAME: string; CONTEXT_DAYS_TO_LIVE: string; CACHE_TABLE_NAME: string; MESSAGE_METADATA_TABLE_NAME: string; BRAVE_SECRET_NAME: string; }): void {
    return;
  }
  getSummary(key: String): Promise<SummarizerSearchApiResponse | Error> {
    return Promise.resolve(braveSummaryValidResponse as SummarizerSearchApiResponse);
  }
  getSearch(query: String): Promise<Error | WebSearchApiResponse> {
    return Promise.resolve(braveSearchValidResponse as WebSearchApiResponse);
  }

}

export const getBraveClient: BraveClientInterface = new BraveClientMock();

export const MOCK_DEPENDENCIES = {
  getBraveClient,
  deleteItem: async () => MOCK_AWS_RESPONSE,
  putItem: async () => MOCK_AWS_RESPONSE,
  validateSlackRequest: () => Promise.resolve(true),
  retrieveThreadHistory: () =>
    Promise.resolve({
      ok: true,
      messages: []
    }),
  retrieveAttachment: () => Promise.resolve('mock attachment'),
  sendSlackMessage: () => Promise.resolve({} as any),
  updateSlackMessage: () => Promise.resolve({} as any),
  openModal: () => Promise.resolve({} as any),
  getResponseAsBlocks,
  getUserInfo: () =>
    Promise.resolve({
      ok: true,
      user: {
        id: 'W012A3CDE',
        team_id: 'T012AB3C4',
        name: 'spengler',
        real_name: 'Gregory Spengler'
      }
    }),
  getItem: async () =>
    Promise.resolve({
      Item: undefined,
      ...MOCK_AWS_RESPONSE
    })
};
