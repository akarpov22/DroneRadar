import { UserRole } from '@prisma/client';
import { MutationResolvers } from '../../../generated/schema';
import { requireRole } from '../../../auth/guards';
import { generateDeviceToken, hashDeviceToken } from '../../../auth/device-token';

export const registerDrone: MutationResolvers['registerDrone'] = async (_, { input }, ctx) => {
  const user = requireRole(ctx, [UserRole.ADMIN, UserRole.PILOT]);
  const { serial, name, regionCode } = input;

  const region = await ctx.prisma.region.findUnique({ where: { regionCode } });
  if (!region) {
    throw new Error('Region not found');
  }

  const deviceToken = generateDeviceToken();
  const deviceTokenHash = hashDeviceToken(deviceToken);

  const existing = await ctx.prisma.drone.findUnique({ where: { serial } });

  const drone = existing
    ? await ctx.prisma.drone.update({
        where: { serial },
        data: {
          name,
          pilotId: user.id,
          deviceTokenHash,
        },
      })
    : await ctx.prisma.drone.create({
        data: {
          serial,
          name,
          pilotId: user.id,
          deviceTokenHash,
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

  return { drone, deviceToken };
};
