import { MutationResolvers } from "../../../generated/schema";
import { ingestPosition } from "../../../services/ingest-position";

export const appendPosition: MutationResolvers['appendPosition'] = async (_, { input }, { prisma }) => {
  return ingestPosition(prisma, input);
};
