import { PrismaClient } from '@prisma/client';
import { pubsub } from '../context';
import { getAlertStatus } from '../services/drone-alert-service';

const SUBSCRIPTION_POSITION_LIMIT = 1;

export async function publishDroneUpdated(prisma: PrismaClient, droneId: string) {
  const drone = await prisma.drone.findUnique({ where: { id: droneId } });
  if (!drone) return;

  const activeSession = await prisma.droneSession.findFirst({
    where: { droneId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  const sessions = activeSession
    ? [
        {
          ...activeSession,
          positions: await prisma.position.findMany({
            where: { sessionId: activeSession.id },
            orderBy: { recordedAt: 'desc' },
            take: SUBSCRIPTION_POSITION_LIMIT,
          }),
        },
      ]
    : [];

  await pubsub.publish('DRONE_UPDATED', {
    droneUpdated: {
      ...drone,
      alertStatus: getAlertStatus(droneId),
      sessions,
    },
  });
}
