import { DroneSessionResolvers } from "../../../generated/schema";

export const droneSessionResolvers: DroneSessionResolvers = {
    id: (parent) => parent.id,
    drone: (parent) => parent.drone,
    region: (parent) => parent.region,
    startedAt: (parent) => parent.startedAt,
    endedAt: (parent) => parent.endedAt,
    positions: (parent) => parent.positions
}
