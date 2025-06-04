import { QueryResolvers } from "../../../generated/schema";

export const queryResolvers: QueryResolvers = {
    drones: async (_, __, { prisma }) => {
        const drones = await prisma.drone.findMany();
        return drones.map(drone => ({
            ...drone,
            createdAt: drone.createdAt.toISOString()
        }));
    },
    drone: async (_, { id }, { prisma }) => {
        const drone = await prisma.drone.findUnique({ where: { id } });
        if (!drone) throw new Error('Drone not found');
        return {
            ...drone,
            createdAt: drone.createdAt.toISOString()
        };
    },
}

