import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: ['src/graphql/mutations/**/*.graphql', 'src/graphql/types/**/*.graphql', 'src/graphql/scalars/**/*.graphql'],
  overwrite: true,
  require: ['ts-node/register'],
  generates: {
    'src/generated/schema.ts': {
      plugins: [
        'typescript',
        'typescript-resolvers',
      ],
      config: {
        mappers: {
          Drone: '../prisma/client#Drone as PrismaDrone',
          DroneModel: '../prisma/client#DroneModel as PrismaDroneModel',
          DroneSession: '../prisma/client#DroneSession as PrismaDroneSession',
          Operator: '../prisma/client#Operator as PrismaOperator',
          Position: '../prisma/client#Position as PrismaPosition',
          Region: '../prisma/client#Region as PrismaRegion'
        },
        contextType: '../context#Context',
      },
    },
  },
}

export default config