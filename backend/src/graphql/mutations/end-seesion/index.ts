import { MutationResolvers } from "../../../generated/schema";

export const endSession: MutationResolvers['endSession'] = async (_, { input }, { prisma }) => {
  const { droneId } = input;

  const activeSession = await prisma.droneSession.findFirst({
    where: {
      droneId,
      endedAt: null,
    },
  });

  if (!activeSession) {
    throw new Error("No active session found for this drone.");
  }

  const updated = await prisma.droneSession.update({
    where: { id: activeSession.id },
    data: {
      endedAt: new Date(),
    },
  });

  return updated
  }