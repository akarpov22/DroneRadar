import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';

export const createDroneModel: MutationResolvers['createDroneModel'] = async (_, { input }, ctx) => {
  requireRole(ctx, [UserRole.ADMIN]);
  return ctx.prisma.droneModel.create({ data: input });
};
