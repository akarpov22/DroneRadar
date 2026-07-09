import { PrismaClient, User, UserRole } from '@prisma/client';
import { AuthPayload } from './jwt';

function roleFromAuth(auth: AuthPayload): UserRole {
  if (auth.roles.includes(UserRole.ADMIN)) return UserRole.ADMIN;
  if (auth.roles.includes(UserRole.PILOT)) return UserRole.PILOT;
  return UserRole.OBSERVER;
}

export async function syncUserFromAuth(prisma: PrismaClient, auth: AuthPayload): Promise<User> {
  const role = roleFromAuth(auth);
  const existing = await prisma.user.findUnique({ where: { auth0Sub: auth.sub } });

  if (!existing) {
    return prisma.user.create({
      data: {
        auth0Sub: auth.sub,
        email: auth.email,
        role,
        roleOverriddenByAdmin: false,
      },
    });
  }

  return prisma.user.update({
    where: { auth0Sub: auth.sub },
    data: {
      ...(auth.email ? { email: auth.email } : {}),
      ...(existing.roleOverriddenByAdmin ? {} : { role }),
    },
  });
}
