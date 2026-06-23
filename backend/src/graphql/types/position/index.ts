import { PositionResolvers } from "../../../generated/schema";

export const positionResolvers = {
    id: (parent) => parent.id,
    session: async (parent, _, { prisma }) =>
      prisma.droneSession.findUnique({ where: { id: parent.sessionId } }),
    latitude: (parent) => parent.latitude,
    longitude: (parent) => parent.longitude,
    altitude: (parent) => parent.altitude ?? null,
    heading: (parent) => parent.heading ?? null,
    speed: (parent) => parent.speed ?? null,
    recordedAt: (parent) => parent.recordedAt,
} as PositionResolvers;
