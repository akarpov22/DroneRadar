import { UserResolvers, UserRole } from '../../../generated/schema';

export const userResolvers = {
  id: (parent) => parent.id,
  auth0Sub: (parent) => parent.auth0Sub,
  email: (parent) => parent.email,
  role: (parent) => parent.role as UserRole,
  createdAt: (parent) => parent.createdAt,
} as UserResolvers;
