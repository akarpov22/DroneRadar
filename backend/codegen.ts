import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: ['src/graphql/mutations/**/*.graphql', 'src/graphql/types/**/*.graphql'],
  overwrite: true,
  require: ['ts-node/register'],
  generates: {
    'src/generated/schema.ts': {
      plugins: [
        'typescript',
        'typescript-resolvers',
      ],
      config: {
        contextType: '../context#Context',
      },
    },
  },
}

export default config