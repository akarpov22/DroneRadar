import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpUri = import.meta.env.VITE_GRAPHQL_HTTP;
const wsUri = import.meta.env.VITE_GRAPHQL_WS;

if (!httpUri) {
  throw new Error('Missing required environment variable: VITE_GRAPHQL_HTTP');
}

if (!wsUri) {
  throw new Error('Missing required environment variable: VITE_GRAPHQL_WS');
}

const httpLink = new HttpLink({
  uri: httpUri,
});

const wsClient = new SubscriptionClient(wsUri, {
  reconnect: true,
});

const wsLink = new WebSocketLink(wsClient);

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  httpLink
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
