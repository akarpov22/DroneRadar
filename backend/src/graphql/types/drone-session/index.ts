import { DroneSessionResolvers } from "../../../generated/schema";

export const droneSessionResolvers = {
    id: (parent) => parent.id,
    drone: async (parent, _, { prisma }) =>
      prisma.drone.findUnique({ where: { id: parent.droneId } }),
    region: async (parent, _, { prisma }) =>
      prisma.region.findUnique({ where: { id: parent.regionId } }),
    startedAt: (parent) => parent.startedAt,
    endedAt: (parent) => parent.endedAt,
    positions: async (parent, _, { prisma }) =>
      prisma.position.findMany({
        where: { sessionId: parent.id },
        orderBy: { recordedAt: 'asc' },
      }),
} as DroneSessionResolvers;
