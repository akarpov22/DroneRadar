import { MutationResolvers } from "../../../generated/schema";
import { pubsub } from "../../../context";

export const appendPosition: MutationResolvers['appendPosition'] = async (_, { input }, { prisma }) => {

  const { droneId, latitude, longitude, altitude, heading, speed, timestamp } = input;

  const drone = await prisma.drone.findUnique({
    where: { id: droneId },
  });

  if (!drone) {
    throw new Error("Drone with this id number not found.");
  }

  const session = await prisma.droneSession.findFirst({
    where: {
      droneId: drone.id,
      endedAt: null,
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  if (!session) {
    throw new Error("No active drone session found.");
  }

  const newPosition = prisma.position.create({
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

  const updatedDrone = await prisma.drone.findUnique({
    where: { id: input.droneId },
  });
  
  await pubsub.publish('DRONE_UPDATED', {
    droneUpdated: updatedDrone,
  });

  return newPosition
  }