import { MutationResolvers } from "../../../generated/schema";

export const createDroneModel: MutationResolvers['createDroneModel'] = async (_, { input }, { prisma }) => {
    const model = await prisma.droneModel.create({ data: input });
    return {
        id: model.id,
        name: model.name,
        manufacturer: model.manufacturer,
        maxRange: model.maxRange,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}
