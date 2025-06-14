import { PrismaClient } from '@prisma/client'
import { PubSub } from 'graphql-subscriptions'

export const prisma = new PrismaClient()
export const pubsub = new PubSub()

export type Context = {
  prisma: PrismaClient
  pubsub: PubSub
}
