import { UserResolvers, UserRole } from '../../../generated/schema';

export const userResolvers = {
  id: (parent) => parent.id,
  email: (parent) => parent.email,
  role: (parent) => parent.role as UserRole,
  createdAt: (parent) => parent.createdAt,
} as UserResolvers;
