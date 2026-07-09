import { UserRole } from '@prisma/client';
import { MutationResolvers } from "../../../generated/schema";
import { requireRole } from "../../../auth/guards";

export const createRegion: MutationResolvers['createRegion'] = async (_, { input }, ctx) => {
  requireRole(ctx, [UserRole.ADMIN]);

  const existing = await ctx.prisma.region.findUnique({
    where: { regionCode: input.regionCode },
  });

  if (existing) {
    if (!existing.active) {
      return ctx.prisma.region.update({
        where: { id: existing.id },
        data: { name: input.name, active: true },
      });
    }
    return existing;
  }

  return ctx.prisma.region.create({
    data: {
      name: input.name,
      regionCode: input.regionCode,
    },
  });
};