import { ApolloClient, InMemoryCache, HttpLink, split, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
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

export function createApolloClient(getAccessToken?: () => Promise<string | null>) {
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

  const httpLink = from([authLink, new HttpLink({ uri: httpUri })]);

  const wsClient = new SubscriptionClient(
    wsUri,
    {
      reconnect: true,
      connectionParams: async () => {
        if (!getAccessToken) return {};
        const token = await getAccessToken();
        return token ? { authToken: token } : {};
      },
    },
  );

  const wsLink = new WebSocketLink(wsClient);

  const splitLink = split(
    ({ query }) => {
      const def = getMainDefinition(query);
      return def.kind === 'OperationDefinition' && def.operation === 'subscription';
    },
    wsLink,
    httpLink,
  );

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  });
}

export const client = createApolloClient();
