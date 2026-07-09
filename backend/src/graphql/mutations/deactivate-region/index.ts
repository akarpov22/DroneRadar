import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';

export const deactivateRegion: MutationResolvers['deactivateRegion'] = async (_, { id }, ctx) => {
  requireRole(ctx, [UserRole.ADMIN]);

  const region = await ctx.prisma.region.findUnique({ where: { id } });
  if (!region) {
    throw new Error('Region not found');
  }

  if (!region.active) {
    return region;
  }

  return ctx.prisma.region.update({
    where: { id },
    data: { active: false },
  });
};
