import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';

export const registerDrone: MutationResolvers['registerDrone'] = async (_, { input }, ctx) => {
  const user = requireRole(ctx, [UserRole.ADMIN, UserRole.PILOT]);
  const { serial, name, regionCode, modelId } = input;

  const region = await ctx.prisma.region.findUnique({ where: { regionCode } });
  if (!region || !region.active) {
    throw new Error('Region not found');
  }

  const model = await ctx.prisma.droneModel.findUnique({ where: { id: modelId } });
  if (!model || !model.active) {
    throw new Error('Drone model not found');
  }

  const existing = await ctx.prisma.drone.findUnique({ where: { serial } });
  if (!existing) {
    throw new Error('Drone not found');
  }

  const drone = await ctx.prisma.drone.update({
    where: { serial },
    data: {
      name,
      pilotId: user.id,
      modelId,
      deviceTokenHash: null,
    },
  });

  const activeSession = await ctx.prisma.droneSession.findFirst({
    where: { droneId: drone.id, endedAt: null },
  });

  if (!activeSession) {
    await ctx.prisma.droneSession.create({
      data: { droneId: drone.id, regionId: region.id },
    });
  }

  return { drone };
};
