import { dateTimeScalar } from "../scalars/date-time";
import { queryResolvers } from "../types/query";
import { mutationResolvers } from "./mutation";

export const resolvers = {
    Query: queryResolvers,
    Mutation: mutationResolvers,
    ...dateTimeScalar
}
