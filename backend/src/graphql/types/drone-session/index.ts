import { DroneSessionResolvers } from "../../../generated/schema";

export const droneSessionResolvers: DroneSessionResolvers = {
    id: (parent) => parent.id,
    drone: (parent, _, { prisma }) => prisma.drone.findUnique({where: {id: parent.droneId}}),
    region: (parent, _, { prisma }) => prisma.region.findUnique({where: {id: parent.regionId}}),
    startedAt: (parent) => parent.startedAt,
    endedAt: (parent) => parent.endedAt,
    positions: (parent, _, { prisma }) => prisma.position.findMany({where: {sessionId: parent.id}})
}
