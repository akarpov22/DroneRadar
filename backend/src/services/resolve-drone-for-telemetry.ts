import { Drone, PrismaClient } from '@prisma/client';

export type ResolveDroneRejectReason =
  | 'region_not_found'
  | 'auto_register_failed';

export type ResolveDroneResult =
  | { ok: true; drone: Drone }
  | { ok: false; reason: ResolveDroneRejectReason; detail?: string };

async function resolveRegion(prisma: PrismaClient, regionCode: string) {
  const region = await prisma.region.findUnique({ where: { regionCode } });

  if (!region) {
    throw new Error(`Region not found: ${regionCode}`);
  }

  return region;
}

async function ensureActiveSession(
  prisma: PrismaClient,
  droneId: string,
  regionId: string,
) {
  const activeSession = await prisma.droneSession.findFirst({
    where: { droneId, endedAt: null },
  });

  if (!activeSession) {
    await prisma.droneSession.create({
      data: { droneId, regionId },
    });
  }
}

export async function resolveDroneForTelemetry(
  prisma: PrismaClient,
  serial: string,
  regionCode: string,
): Promise<ResolveDroneResult> {
  const existing = await prisma.drone.findUnique({ where: { serial } });

  if (existing) {
    try {
      const region = await resolveRegion(prisma, regionCode);
      await ensureActiveSession(prisma, existing.id, region.id);
      return { ok: true, drone: existing };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, reason: 'region_not_found', detail: message };
    }
  }

  try {
    const region = await resolveRegion(prisma, regionCode);
    const drone = await prisma.drone.create({
      data: {
        serial,
        name: `Drone-${serial}`,
      },
    });

    await ensureActiveSession(prisma, drone.id, region.id);
    console.log(`MQTT: auto-registered drone serial=${serial}, region=${region.regionCode}`);

    return { ok: true, drone };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`MQTT: auto-register failed for serial ${serial}: ${message}`);
    return { ok: false, reason: 'auto_register_failed', detail: message };
  }
}
