import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import { fromLonLat } from 'ol/proj';

export const LOST_SIGNAL_MS = 30_000;
const GRAVITY = 9.81;
const MIN_FALL_RADIUS_M = 15;
const MAX_FALL_RADIUS_M = 5000;
const CIRCLE_SEGMENTS = 64;

export function isDroneSignalLost(recordedAt?: string, nowMs = Date.now()): boolean {
  if (!recordedAt) return false;
  return nowMs - new Date(recordedAt).getTime() >= LOST_SIGNAL_MS;
}

export function computeFallRadiusMeters(
  altitude: number | null,
  speedKmh: number | null,
): number {
  const altitudeM = Math.max(altitude ?? 0, 0);
  const speedMs = Math.max((speedKmh ?? 0) / 3.6, 0);
  const fallTimeSec = altitudeM > 0 ? Math.sqrt(2 * altitudeM / GRAVITY) : 0;
  // Fall: horizontal drift while descending. Hover: limited drift before signal was declared lost.
  const fallDriftM = speedMs * fallTimeSec;
  const hoverDriftM = speedMs * (LOST_SIGNAL_MS / 1000);
  const radiusM = Math.max(fallDriftM, hoverDriftM);
  return Math.min(Math.max(radiusM, MIN_FALL_RADIUS_M), MAX_FALL_RADIUS_M);
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

function pointAtBearing(
  latitude: number,
  longitude: number,
  bearingDeg: number,
  distanceM: number,
): { latitude: number; longitude: number } {
  const angularDist = distanceM / 6371000;
  const bearing = toRadians(bearingDeg);
  const lat1 = toRadians(latitude);
  const lon1 = toRadians(longitude);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist)
    + Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing),
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
    Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2),
  );

  return {
    latitude: toDegrees(lat2),
    longitude: ((toDegrees(lon2) + 540) % 360) - 180,
  };
}

function buildCircleRing(lon: number, lat: number, radiusM: number): number[][] {
  const ring: number[][] = [];
  for (let i = 0; i <= CIRCLE_SEGMENTS; i += 1) {
    const bearing = (360 / CIRCLE_SEGMENTS) * i;
    const point = pointAtBearing(lat, lon, bearing, radiusM);
    ring.push(fromLonLat([point.longitude, point.latitude]));
  }
  return ring;
}

const UNCERTAINTY_ZONE_FILL = 'rgba(107, 114, 128, 0.25)';
const UNCERTAINTY_ZONE_STROKE = '#6b7280';

export function createFallCircleFeature(
  lon: number,
  lat: number,
  radiusM: number,
): Feature<Polygon> {
  const feature = new Feature({
    geometry: new Polygon([buildCircleRing(lon, lat, radiusM)]),
  });
  feature.setStyle(new Style({
    fill: new Fill({ color: UNCERTAINTY_ZONE_FILL }),
    stroke: new Stroke({ color: UNCERTAINTY_ZONE_STROKE, width: 2 }),
  }));
  return feature;
}

export function updateFallCircleGeometry(
  feature: Feature<Polygon>,
  lon: number,
  lat: number,
  radiusM: number,
): void {
  feature.getGeometry()?.setCoordinates([buildCircleRing(lon, lat, radiusM)]);
  feature.changed();
}
