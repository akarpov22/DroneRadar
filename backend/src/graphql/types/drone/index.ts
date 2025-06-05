import { DroneResolvers } from "../../../generated/schema";

export const droneResolvers: DroneResolvers = {
    id: (parent) => parent.id,
    name: (parent) => parent.name,
    serial: (parent) => parent.serial ?? null,
    model: (parent, _, {prisma}) => parent.modelId ? prisma.droneModel.findUnique({where:{id: parent.modelId}}) : null,
    operator: (parent, _, {prisma}) =>  parent.operatorId ? prisma.operator.findUnique({where:{id: parent.operatorId}}) : null,
    sessions: (parent, _, {prisma}) =>  prisma.droneSession.findMany({where:{droneId: parent.id}}),
    createdAt: (parent) => parent.createdAt,
}
