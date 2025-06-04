import { DroneModelResolvers } from "../../../generated/schema";

export const droneModelResolvers: DroneModelResolvers = {
    id: (parent) => parent.id,
    name: (parent) => parent.name,
    manufacturer: (parent) => parent.manufacturer,
    maxRange: (parent) => parent.maxRange,
    createdAt: (parent) => parent.createdAt,
    updatedAt: (parent) => parent.updatedAt
}