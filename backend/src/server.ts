import { ApolloServer } from 'apollo-server'
import { schema } from './schema'
import { prisma, pubsub, Context } from './context'

const server = new ApolloServer({
  schema,
  context: (): Context => ({
    prisma,
    pubsub,
  }),
})

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 Drone Tracker GraphQL API running at ${url}`)
})
