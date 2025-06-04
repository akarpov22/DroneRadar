import { MutationResolvers } from "../../../generated/schema";

export const createDroneModel: MutationResolvers['createDroneModel'] = async (_, { input }, { prisma }) => {
    const model = await prisma.droneModel.create({ data: input });
    return model;
}
