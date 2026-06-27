import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';
import { deleteUserZone as deleteUserZoneService } from '../../../services/user-zones';

export const deleteUserZone: MutationResolvers['deleteUserZone'] = async (_, { id }, ctx) => {
  const user = requireRole(ctx, [UserRole.PILOT]);
  return deleteUserZoneService(user.id, id);
};
