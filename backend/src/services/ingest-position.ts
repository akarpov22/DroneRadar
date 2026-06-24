import { Position, PrismaClient } from '@prisma/client';

export type IngestPositionInput = {
  droneId: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: string | Date;
};

export async function ingestPosition(
  prisma: PrismaClient,
  input: IngestPositionInput,
): Promise<Position> {
  const { droneId, latitude, longitude, altitude, heading, speed, timestamp } = input;

  const drone = await prisma.drone.findUnique({
    where: { id: droneId },
  });

  if (!drone) {
    throw new Error('Drone with this id number not found.');
  }

  const session = await prisma.droneSession.findFirst({
    where: {
      droneId: drone.id,
      endedAt: null,
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  if (!session) {
    throw new Error('No active drone session found.');
  }

  return prisma.position.create({
    data: {
      sessionId: session.id,
      latitude,
      longitude,
      altitude,
      heading,
      speed,
      recordedAt: new Date(timestamp),
    },
  });
}
