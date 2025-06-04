import { MutationResolvers } from "../../../generated/schema";

export const createDrone: MutationResolvers['createDrone'] = async (_, { input }, { prisma }) => {
    const drone = await prisma.drone.create({ data: input });
    return {
        ...drone,
        createdAt: drone.createdAt.toISOString()
    };
}
