import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';
import { updateUserZone as updateUserZoneService } from '../../../services/user-zones';

export const updateUserZone: MutationResolvers['updateUserZone'] = async (_, { input }, ctx) => {
  const user = requireRole(ctx, [UserRole.PILOT]);
  return updateUserZoneService(user.id, input);
};
