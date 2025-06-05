import { MutationResolvers } from "../../../generated/schema";

export const createRegion: MutationResolvers['createRegion'] = async (_, { input }, { prisma }) => {
  const existing = await prisma.region.findUnique({
    where: { regionCode: input.regionCode },
  });

  if (existing) {
    return existing;
  }

  return prisma.region.create({
    data: {
      name: input.name,
      regionCode: input.regionCode,
    },
  });
  }