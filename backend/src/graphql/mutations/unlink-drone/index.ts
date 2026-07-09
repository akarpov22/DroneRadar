import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';

export const unlinkDrone: MutationResolvers['unlinkDrone'] = async (_, { droneId }, ctx) => {
  const user = requireRole(ctx, [UserRole.ADMIN, UserRole.PILOT]);

  const drone = await ctx.prisma.drone.findUnique({ where: { id: droneId } });
  if (!drone) {
    throw new Error('Drone not found');
  }

  if (drone.pilotId !== user.id) {
    throw new Error('Not authorized to unlink this drone');
  }

  return ctx.prisma.drone.update({
    where: { id: droneId },
    data: {
      pilotId: null,
      deviceTokenHash: null,
    },
  });
};
