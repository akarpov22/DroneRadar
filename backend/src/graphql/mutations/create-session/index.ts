import { MutationResolvers } from "../../../generated/schema";

export const createSession: MutationResolvers['createSession'] = async (_, { input }, { prisma }) => {
  const { droneId, regionId } = input;

    const activeSession = await prisma.droneSession.findFirst({
      where: {
        droneId,
        endedAt: null,
      },
    });

    if (activeSession) {
      await prisma.droneSession.update({
        where: { id: activeSession.id },
        data: { endedAt: new Date() },
      });
    }

    const newSession = await prisma.droneSession.create({
      data: {
        droneId,
        regionId,
      },
    });

    return newSession;
  }