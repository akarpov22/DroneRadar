import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';

export const deactivateDroneModel: MutationResolvers['deactivateDroneModel'] = async (_, { id }, ctx) => {
  requireRole(ctx, [UserRole.ADMIN]);

  const model = await ctx.prisma.droneModel.findUnique({ where: { id } });
  if (!model) {
    throw new Error('Drone model not found');
  }

  if (!model.active) {
    return model;
  }

  return ctx.prisma.droneModel.update({
    where: { id },
    data: { active: false },
  });
};
