import { RegionResolvers } from "../../../generated/schema";

export const regionResolvers: RegionResolvers = {
    id: (parent) => parent.id,
    name: (parent) => parent.name,
    regionCode: (parent) => parent.regionCode,
    sessions: (parent, _, { prisma }) => prisma.droneSession.findMany({where: {regionId: parent.id}})
}