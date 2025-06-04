import { makeExecutableSchema } from '@graphql-tools/schema'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { resolvers } from './graphql/resolvers'


const typeDefs = mergeTypeDefs(loadFilesSync(['src/graphql/types/**/*.graphql', 'src/graphql/mutations/**/*.graphql',
                                                                                    'src/graphql/scalars/**/*.graphql']))

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})