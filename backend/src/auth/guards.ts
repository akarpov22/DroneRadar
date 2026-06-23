import { User, UserRole } from '@prisma/client';
import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { Context } from '../context';

export function requireAuth(ctx: Context): User {
  if (!ctx.user) {
    throw new AuthenticationError('Authentication required');
  }
  return ctx.user;
}

export function requireRole(ctx: Context, allowed: UserRole[]): User {
  const user = requireAuth(ctx);
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  return user;
}

export function hasRole(user: User, allowed: UserRole[]): boolean {
  return allowed.includes(user.role);
}
