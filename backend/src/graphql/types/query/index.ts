import { UserRole } from '@prisma/client';
import { QueryResolvers } from "../../../generated/schema";
import { requireAuth, requireRole } from "../../../auth/guards";
import { getFlightZonesByBbox } from "../../../services/flight-zones-db";
import { listUserZones } from "../../../services/user-zones";

export const queryResolvers: QueryResolvers = {
    me: (_, __, ctx) => requireAuth(ctx),
    drones: (_, __, { prisma, user }) => {
        if (!user) return prisma.drone.findMany();
        if (user.role === UserRole.ADMIN || user.role === UserRole.OBSERVER) {
            return prisma.drone.findMany();
        }
        return prisma.drone.findMany({ where: { pilotId: user.id } });
    },
    drone: async (_, { id }, { prisma }) => {
        const drone = await prisma.drone.findUnique({ where: { id } });
        if (!drone) throw new Error('Drone not found');
        return drone;
    },
    droneModels: (_, __, { prisma }) => prisma.droneModel.findMany(),
    droneModel: async (_, { id }, { prisma }) => {
        const model = await prisma.droneModel.findUnique({ where: { id } });
        if (!model) throw new Error('Drone model not found');
        return model;
    },
    droneSessions: async (_, __, { prisma }) => {
        return await prisma.droneSession.findMany()
    },
    droneSession: async (_, { id }, { prisma }) => {
        const session = await prisma.droneSession.findUnique({
            where: { id },
        });
        if (!session) throw new Error('Session not found');
        return session;
    },
    operators: (_, __, { prisma }) => prisma.operator.findMany(),
    operator: async (_, { id }, { prisma }) => {
        const operator = await prisma.operator.findUnique({
            where: { id },
        });
        if (!operator) throw new Error('Operator not found');
        return operator;
    },
    positions: (_, __, { prisma }) => prisma.position.findMany(),
    position: async (_, { id }, { prisma }) => {
        const position = await prisma.position.findUnique({
            where: { id }
        });
        if (!position) throw new Error('Position not found');
        return position;
    },
    regions: (_, __, { prisma }) => prisma.region.findMany(),
    region: async (_, { id }, { prisma }) => {
        const region = await prisma.region.findUnique({
            where: { id },
        });
        if (!region) throw new Error('Region not found');
        return region;
    },
    flightRestrictionZones: async (_, { west, south, east, north, includeNotam }) => {
        return getFlightZonesByBbox([west, south, east, north], includeNotam ?? false);
    },
    userZones: (_, __, ctx) => {
        const user = requireRole(ctx, [UserRole.PILOT]);
        return listUserZones(user.id);
    },
}

