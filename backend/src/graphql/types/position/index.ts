import { PositionResolvers, Position } from "../../../generated/schema";

export const positionResolvers: PositionResolvers = {
    id: (parent: Position) => parent.id,
    session:  (parent, _, {prisma}) => prisma.droneSession.findUnique({where: {id: parent.sessionId}}),
    latitude: (parent: Position) => parent.latitude,
    longitude: (parent: Position) => parent.longitude,
    altitude: (parent: Position) => parent.altitude ?? null,
    heading: (parent: Position) => parent.heading ?? null,
    speed: (parent: Position) => parent.speed ?? null,
    recordedAt: (parent: Position) => parent.recordedAt,
}
