import { dateTimeScalar } from "../scalars/date-time";
import { droneResolvers } from "../types/drone";
import { droneModelResolvers } from "../types/drone-model";
import { droneSessionResolvers } from "../types/drone-session";
import { operatorResolvers } from "../types/operator";
import { positionResolvers } from "../types/position";
import { queryResolvers } from "../types/query";
import { regionResolvers } from "../types/region";
import { mutationResolvers } from "./mutation";

export const resolvers = {
    Query: queryResolvers,
    Mutation: mutationResolvers,
    Drone: droneResolvers,
    DroneModel: droneModelResolvers,
    DroneSession: droneSessionResolvers,
    Operator: operatorResolvers,
    Position: positionResolvers,
    Region: regionResolvers,
    ...dateTimeScalar
}
