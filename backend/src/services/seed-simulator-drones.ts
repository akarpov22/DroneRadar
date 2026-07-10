import { PrismaClient } from '@prisma/client';

const DEFAULT_FLEET_SIZE = 5;

function buildSimSerial(index: number, regionCode = 'SE'): string {
  return `${regionCode.toUpperCase()}-SIM-${String(index).padStart(3, '0')}`;
}

export async function seedSimulatorDrones(prisma: PrismaClient): Promise<void> {
  const fleetSize = Math.max(1, Number(process.env.FLEET_COUNT) || DEFAULT_FLEET_SIZE);
  const regionCode = process.env.REGION_CODE || 'SE';

  const model = await prisma.droneModel.findFirst({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  if (!model) {
    console.warn('seedSimulatorDrones: no active drone model — skipping fleet seed');
    return;
  }

  for (let i = 1; i <= fleetSize; i += 1) {
    const serial = buildSimSerial(i, regionCode);
    await prisma.drone.upsert({
      where: { serial },
      create: {
        serial,
        name: serial,
        modelId: model.id,
      },
      update: {
        modelId: model.id,
      },
    });
  }

  console.log(`Seeded ${fleetSize} simulator drones (${regionCode}-SIM-*) with model "${model.name}"`);
}
