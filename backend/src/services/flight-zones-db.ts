import { Prisma } from '@prisma/client';
import { prisma } from '../context';
import {
  ALL_LAYERS,
  Bbox,
  fetchLfvLayer,
  NormalizedZone,
  SWEDEN_BBOX,
} from './lfv-wfs-client';

export interface FlightZoneDto {
  id: string;
  layerType: string;
  name: string | null;
  description: string | null;
  lowerLimit: string | null;
  upperLimit: string | null;
  validFrom: string | null;
  validTo: string | null;
  geometry: Record<string, unknown>;
}

function toDto(zone: {
  externalId: string;
  layerType: string;
  name: string | null;
  description: string | null;
  lowerLimit: string | null;
  upperLimit: string | null;
  validFrom: string | null;
  validTo: string | null;
  geometry: Prisma.JsonValue;
}): FlightZoneDto {
  return {
    id: zone.externalId,
    layerType: zone.layerType,
    name: zone.name,
    description: zone.description,
    lowerLimit: zone.lowerLimit,
    upperLimit: zone.upperLimit,
    validFrom: zone.validFrom,
    validTo: zone.validTo,
    geometry: zone.geometry as Record<string, unknown>,
  };
}

export async function getFlightZonesByBbox(
  bbox: Bbox,
  includeNotam = false,
): Promise<FlightZoneDto[]> {
  const [west, south, east, north] = bbox;

  const zones = await prisma.flightRestrictionZone.findMany({
    where: {
      west: { lt: east },
      east: { gt: west },
      south: { lt: north },
      north: { gt: south },
      ...(includeNotam ? {} : { layerType: { not: 'NOTAM' } }),
    },
  });

  return zones.map(toDto);
}

async function upsertZone(zone: NormalizedZone): Promise<void> {
  await prisma.flightRestrictionZone.upsert({
    where: { externalId: zone.id },
    create: {
      externalId: zone.id,
      sourceLayer: zone.sourceLayer,
      layerType: zone.layerType,
      name: zone.name,
      description: zone.description,
      lowerLimit: zone.lowerLimit,
      upperLimit: zone.upperLimit,
      validFrom: zone.validFrom,
      validTo: zone.validTo,
      geometry: zone.geometry as Prisma.InputJsonValue,
      west: zone.west,
      south: zone.south,
      east: zone.east,
      north: zone.north,
    },
    update: {
      sourceLayer: zone.sourceLayer,
      layerType: zone.layerType,
      name: zone.name,
      description: zone.description,
      lowerLimit: zone.lowerLimit,
      upperLimit: zone.upperLimit,
      validFrom: zone.validFrom,
      validTo: zone.validTo,
      geometry: zone.geometry as Prisma.InputJsonValue,
      west: zone.west,
      south: zone.south,
      east: zone.east,
      north: zone.north,
    },
  });
}

async function syncLayer(typename: string, bbox: Bbox): Promise<number> {
  const zones = await fetchLfvLayer(typename, bbox);
  const ids = zones.map((z) => z.id);

  for (const zone of zones) {
    await upsertZone(zone);
  }

  await prisma.flightRestrictionZone.deleteMany({
    where: {
      sourceLayer: typename,
      externalId: { notIn: ids },
    },
  });

  return zones.length;
}

let syncInProgress = false;

export async function syncFlightZonesFromLfv(): Promise<void> {
  if (syncInProgress) {
    console.log('[flight-zones] sync already in progress, skipping');
    return;
  }

  syncInProgress = true;
  const startedAt = Date.now();
  const bbox: Bbox = [...SWEDEN_BBOX];

  try {
    console.log('[flight-zones] starting LFV sync for Sweden…');
    let total = 0;

    for (const layer of ALL_LAYERS) {
      const count = await syncLayer(layer, bbox);
      total += count;
      console.log(`[flight-zones] synced ${layer}: ${count} zones`);
    }

    console.log(
      `[flight-zones] sync complete: ${total} zones in ${Date.now() - startedAt}ms`,
    );
  } catch (err) {
    console.error('[flight-zones] sync failed:', err);
  } finally {
    syncInProgress = false;
  }
}

const DEFAULT_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function startFlightZoneSyncScheduler(): void {
  const intervalMs = Number(process.env.FLIGHT_ZONE_SYNC_INTERVAL_MS) || DEFAULT_SYNC_INTERVAL_MS;
  const syncOnStart = process.env.FLIGHT_ZONE_SYNC_ON_START !== 'false';

  if (syncOnStart) {
    void syncFlightZonesFromLfv();
  }

  setInterval(() => {
    void syncFlightZonesFromLfv();
  }, intervalMs);

  console.log(
    `[flight-zones] scheduler started (interval ${Math.round(intervalMs / 60000)} min)`,
  );
}
