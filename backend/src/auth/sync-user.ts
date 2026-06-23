import { PrismaClient, User, UserRole } from '@prisma/client';
import { AuthPayload } from './jwt';

export async function syncUserFromAuth(prisma: PrismaClient, auth: AuthPayload): Promise<User> {
  const role = auth.roles.includes(UserRole.ADMIN)
    ? UserRole.ADMIN
    : auth.roles.includes(UserRole.PILOT)
      ? UserRole.PILOT
      : UserRole.OBSERVER;

  return prisma.user.upsert({
    where: { auth0Sub: auth.sub },
    create: {
      auth0Sub: auth.sub,
      email: auth.email,
      role,
    },
    update: {
      email: auth.email ?? undefined,
      role,
    },
  });
}
