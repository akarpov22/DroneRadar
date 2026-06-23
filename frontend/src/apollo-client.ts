import { createContext } from 'react';
import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { getGraphqlUrls } from './config/api';

export const SubscriptionClientContext = createContext<SubscriptionClient | null>(null);

function createSubscriptionClient(
  getAccessToken?: () => Promise<string | null>,
): SubscriptionClient {
  const { wsUri } = getGraphqlUrls();
  return new SubscriptionClient(wsUri, {
    reconnect: true,
    connectionParams: async () => {
      if (!getAccessToken) return {};
      const token = await getAccessToken();
      return token ? { authToken: token } : {};
    },
  });
}

export function createApolloClient(getAccessToken?: () => Promise<string | null>) {
  const { httpUri } = getGraphqlUrls();
  const subscriptionClient = createSubscriptionClient(getAccessToken);

  const authLink = setContext(async (_, { headers }) => {
    if (!getAccessToken) return { headers };
    const token = await getAccessToken();
    return {
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  const client = new ApolloClient({
    link: from([authLink, new HttpLink({ uri: httpUri })]),
    cache: new InMemoryCache(),
  });

  return { client, subscriptionClient };
}

const bundle = createApolloClient();
export const client = bundle.client;
export const subscriptionClient = bundle.subscriptionClient;
