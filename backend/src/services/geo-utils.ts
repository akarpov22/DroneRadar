import {
  booleanPointInPolygon,
  distance,
  point,
  pointToPolygonDistance,
} from '@turf/turf';
import type { Feature, GeoJsonProperties, Geometry, Polygon, MultiPolygon } from 'geojson';

type ZoneGeometry = Polygon | MultiPolygon;

function toZoneFeature(geometry: unknown): Feature<ZoneGeometry, GeoJsonProperties> | null {
  if (!geometry || typeof geometry !== 'object') return null;

  const geo = geometry as Geometry;
  if (geo.type !== 'Polygon' && geo.type !== 'MultiPolygon') return null;

  return {
    type: 'Feature',
    properties: {},
    geometry: geo as ZoneGeometry,
  };
}

export function horizontalDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return distance(point([lon1, lat1]), point([lon2, lat2]), { units: 'meters' });
}

export function isPointInZone(lat: number, lon: number, geometry: unknown): boolean {
  const feature = toZoneFeature(geometry);
  if (!feature) return false;

  return booleanPointInPolygon(point([lon, lat]), feature);
}

export function distanceToZoneBoundaryMeters(
  lat: number,
  lon: number,
  geometry: unknown,
): number {
  const feature = toZoneFeature(geometry);
  if (!feature) return Infinity;

  if (booleanPointInPolygon(point([lon, lat]), feature)) {
    return 0;
  }

  return pointToPolygonDistance(point([lon, lat]), feature, { units: 'meters' });
}
