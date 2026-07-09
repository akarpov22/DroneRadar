import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';
import { updateUserRole as updateUserRoleService } from '../../../services/admin-users';

export const updateUserRole: MutationResolvers['updateUserRole'] = async (_, { userId, role }, ctx) => {
  const admin = requireRole(ctx, [UserRole.ADMIN]);
  return updateUserRoleService(ctx.prisma, admin.id, userId, role as UserRole);
};
