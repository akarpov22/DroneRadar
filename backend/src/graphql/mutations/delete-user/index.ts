import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';
import { deleteUser as deleteUserService } from '../../../services/admin-users';

export const deleteUser: MutationResolvers['deleteUser'] = async (_, { userId }, ctx) => {
  const admin = requireRole(ctx, [UserRole.ADMIN]);
  return deleteUserService(ctx.prisma, admin.id, userId);
};
