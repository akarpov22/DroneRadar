import { PrismaClient } from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';
import { pubsub } from '../context';

export async function publishDroneUpdated(prisma: PrismaClient, droneId: string) {
  const drone = await prisma.drone.findUnique({ where: { id: droneId } });
  if (!drone) return;

  await pubsub.publish('DRONE_UPDATED', { droneUpdated: drone });
}
