import { OperatorResolvers } from "../../../generated/schema";

export const operatorResolvers: OperatorResolvers = {
    id: (parent) => parent.id,
    name: (parent) => parent.name,
    licenseId: (parent) => parent.licenseId ?? null,
    drones: (parent, _, {prisma}) => prisma.drone.findMany({where: {operatorId: parent.id}})
}