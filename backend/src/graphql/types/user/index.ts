import { UserResolvers } from '../../../generated/schema';

export const userResolvers: UserResolvers = {
  id: (parent) => parent.id,
  email: (parent) => parent.email,
  role: (parent) => parent.role,
  createdAt: (parent) => parent.createdAt,
};
