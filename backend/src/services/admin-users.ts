import { PrismaClient, User, UserRole } from '@prisma/client';

const DEFAULT_LIMIT = 50;

export async function listUsers(
  prisma: PrismaClient,
  search?: string | null,
  limit = DEFAULT_LIMIT,
): Promise<User[]> {
  const trimmed = search?.trim();

  return prisma.user.findMany({
    where: trimmed
      ? {
          OR: [
            {
              email: {
                contains: trimmed,
                mode: 'insensitive',
              },
            },
            {
              auth0Sub: {
                contains: trimmed,
                mode: 'insensitive',
              },
            },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function updateUserRole(
  prisma: PrismaClient,
  adminId: string,
  userId: string,
  role: UserRole,
): Promise<User> {
  if (adminId === userId) {
    throw new Error('Cannot change your own role');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      role,
      roleOverriddenByAdmin: true,
    },
  });
}

export async function deleteUser(
  prisma: PrismaClient,
  adminId: string,
  userId: string,
): Promise<boolean> {
  if (adminId === userId) {
    throw new Error('Cannot delete your own account');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  await prisma.$transaction([
    prisma.drone.updateMany({
      where: { pilotId: userId },
      data: {
        pilotId: null,
        deviceTokenHash: null,
      },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return true;
}
