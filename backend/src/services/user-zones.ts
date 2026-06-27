import { Prisma, UserZone, UserZoneShape } from '@prisma/client';
import { ForbiddenError } from 'apollo-server-express';
import { prisma } from '../context';

export interface CreateUserZoneInput {
  name?: string | null;
  shapeType: UserZoneShape;
  geometry: Record<string, unknown>;
}

export interface UpdateUserZoneInput {
  id: string;
  name?: string | null;
  geometry?: Record<string, unknown> | null;
}

function isFiniteCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validatePolygonGeometry(geometry: Record<string, unknown>): void {
  if (geometry.type !== 'Polygon') {
    throw new Error('Geometry must be a GeoJSON Polygon');
  }

  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    throw new Error('Invalid polygon coordinates');
  }

  const ring = normalizeRing(coordinates[0] as number[][]);
  geometry.coordinates = [ring];

  if (ring.length < 4) {
    throw new Error('Polygon must have at least 4 coordinate pairs');
  }

  for (const coord of ring) {
    if (!Array.isArray(coord) || coord.length < 2) {
      throw new Error('Invalid coordinate pair');
    }
    const [lon, lat] = coord;
    if (!isFiniteCoord(lon) || !isFiniteCoord(lat)) {
      throw new Error('Coordinates must be finite numbers');
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new Error('Coordinates out of range');
    }
  }
}

function normalizeRing(ring: number[][]): number[][] {
  if (!Array.isArray(ring) || ring.length < 3) {
    throw new Error('Invalid polygon coordinates');
  }

  const normalized = ring.map(([lon, lat]) => [lon, lat]);
  const [fLon, fLat] = normalized[0];
  const [lLon, lLat] = normalized[normalized.length - 1];

  if (fLon !== lLon || fLat !== lLat) {
    normalized.push([fLon, fLat]);
  }

  return normalized;
}

export function computeBbox(geometry: Record<string, unknown>): {
  west: number;
  south: number;
  east: number;
  north: number;
} {
  validatePolygonGeometry(geometry);
  const ring = (geometry.coordinates as number[][][])[0];

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const [lon, lat] of ring) {
    west = Math.min(west, lon);
    south = Math.min(south, lat);
    east = Math.max(east, lon);
    north = Math.max(north, lat);
  }

  return { west, south, east, north };
}

export async function assertUserZoneOwner(userId: string, zoneId: string): Promise<UserZone> {
  const zone = await prisma.userZone.findFirst({
    where: { id: zoneId, userId },
  });
  if (!zone) {
    throw new ForbiddenError('Access denied');
  }
  return zone;
}

export async function listUserZones(userId: string): Promise<UserZone[]> {
  return prisma.userZone.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createUserZone(
  userId: string,
  input: CreateUserZoneInput,
): Promise<UserZone> {
  validatePolygonGeometry(input.geometry);
  const bbox = computeBbox(input.geometry);

  const zone = await prisma.userZone.create({
    data: {
      userId,
      name: input.name ?? null,
      shapeType: input.shapeType,
      geometry: input.geometry as Prisma.InputJsonValue,
      ...bbox,
    },
  });

  return zone;
}

export async function updateUserZone(
  userId: string,
  input: UpdateUserZoneInput,
): Promise<UserZone> {
  await assertUserZoneOwner(userId, input.id);

  const data: Prisma.UserZoneUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.geometry != null) {
    validatePolygonGeometry(input.geometry);
    const bbox = computeBbox(input.geometry);
    data.geometry = input.geometry as Prisma.InputJsonValue;
    data.west = bbox.west;
    data.south = bbox.south;
    data.east = bbox.east;
    data.north = bbox.north;
  }

  const zone = await prisma.userZone.update({
    where: { id: input.id },
    data,
  });

  return zone;
}

export async function deleteUserZone(userId: string, zoneId: string): Promise<boolean> {
  const result = await prisma.userZone.deleteMany({
    where: { id: zoneId, userId },
  });

  if (result.count !== 1) {
    throw new ForbiddenError('Access denied');
  }

  return true;
}
