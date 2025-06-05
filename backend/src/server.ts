import express from 'express';
import { createServer } from 'http';
import { ApolloServer } from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { schema } from './schema';
import { pubsub, prisma, Context } from './context';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const server = new ApolloServer({
    schema,
    context: (): Context => ({
      prisma,
      pubsub,
    }),
  });

  await server.start();
  server.applyMiddleware({ app });

  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: async () => ({
        prisma,
        pubsub,
      }),
    },
    {
      server: httpServer,
      path: server.graphqlPath,
    }
  );

  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP server ready at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`📡 WS server ready at ws://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();
