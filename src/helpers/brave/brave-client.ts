import { SlackEventsEnv } from '@functions/slack-event-handler';
import { makeLogger } from '@src/logging';
import { BraveClient, BraveClientInterface, SummarizerSearchApiResponse, WebSearchApiResponse } from './brave-helpers';
import { ChatDependencies } from '../chat';

const logger = makeLogger('brave-client');

export const getBraveClient: BraveClientInterface = new BraveClient();

export const callAPI = async (
    query: string,
    env: SlackEventsEnv ,
    dependencies: ChatDependencies,
  ): Promise<SummarizerSearchApiResponse> => {
    logger.debug(`callAPI query ${JSON.stringify(query)}`);
    let client = dependencies.getBraveClient;
   
    await client.getSecret(env);

    const searchResult: WebSearchApiResponse = await client.getSearch(query).then(res=>res as WebSearchApiResponse)

    if(searchResult === undefined || searchResult.summarizer === undefined || searchResult.summarizer.key === undefined){
      throw(`Brave Search results empty or no summarizer`);
    }

    return await client.getSummary(searchResult.summarizer.key).then(res => res as SummarizerSearchApiResponse)
  };