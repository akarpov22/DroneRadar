import { DroneResolvers } from "../../../generated/schema";

export const queryResolvers: DroneResolvers = {
    id: (parent) => parent.id,
    name: (parent) => parent.name,
    serial: (parent) => parent.serial ?? null,
    modelId: (parent) => parent.modelId,
    operatorId: (parent) => parent.operatorId,
    createdAt: (parent) => parent.createdAt,
}

