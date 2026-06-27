import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';
import { createUserZone as createUserZoneService } from '../../../services/user-zones';

export const createUserZone: MutationResolvers['createUserZone'] = async (_, { input }, ctx) => {
  const user = requireRole(ctx, [UserRole.PILOT]);
  return createUserZoneService(user.id, input);
};
