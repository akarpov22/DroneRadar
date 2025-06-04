import { DroneResolvers } from "../../../generated/schema";

export const droneResolvers: DroneResolvers = {
    id: (parent) => parent.id,
    name: (parent) => parent.name,
    serial: (parent) => parent.serial ?? null,
    model: (parent) => parent.model ?? null,
    operator: (parent) => parent.operator,
    sessions: (parent) =>  parent.sessions,
    createdAt: (parent) => parent.createdAt,
}
