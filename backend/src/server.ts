import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { ApolloServer } from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { schema } from './schema';
import { buildContext } from './build-context';
import { startPgListener } from './db/pg-listener';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const server = new ApolloServer({
    schema,
    context: ({ req }) => buildContext(req.headers.authorization),
  });

  await server.start();
  server.applyMiddleware({ app });

  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: async (connectionParams: Record<string, unknown>) => {
        const wsToken = typeof connectionParams?.authToken === 'string'
          ? connectionParams.authToken
          : undefined;
        return buildContext(undefined, wsToken);
      },
    },
    {
      server: httpServer,
      path: server.graphqlPath,
    }
  );

  startPgListener();

  if (process.env.AUTH0_DISABLED !== 'true') {
    console.log(`Auth0 domain: ${process.env.AUTH0_DOMAIN}`);
    console.log(`Auth0 audience: ${process.env.AUTH0_AUDIENCE}`);
  } else {
    console.log('Auth0 disabled (dev mode)');
  }

  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP server ready at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`📡 WS server ready at ws://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();
