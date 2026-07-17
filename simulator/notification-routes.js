/**
 * Demo routes for the simulator fleet.
 *
 * Fleet serials: SE-SIM-001, SE-SIM-003, SE-SIM-004, SE-SIM-005 (SE-SIM-002 removed).
 */

import { toRadians } from './geo.js';

/** @typedef {{ latitude: number, longitude: number, altitude: number, holdMs?: number, legMs?: number }} Waypoint */
/** @typedef {{ id: string, name: string, demoKind: string, zoneLabel?: string, zoneType?: string, fleetPhaseMs?: number, cycleDurationMs?: number, waypoints: Waypoint[] }} DemoRoute */

export const USER_ZONE_CENTER = {
  latitude: 59.435536,
  longitude: 17.648498,
};

export const USER_ZONE_RADIUS_M = 400;

/** Pair starts at opposite ends of a 15 s shuttle (half-cycle phase). */
export const PAIR_CYCLE_MS = 15_000;
export const PAIR_PHASE_OFFSET_MS = PAIR_CYCLE_MS / 2;

/** Separation at shuttle ends (>50 m) → green; meet in the middle → yellow/red. */
export const PAIR_SHUTTLE_LENGTH_M = 100;

function offsetMeters(lat, lon, northM, eastM) {
  const dLat = (northM / 6371000) * (180 / Math.PI);
  const dLon = (eastM / (6371000 * Math.cos(toRadians(lat)))) * (180 / Math.PI);
  return { latitude: lat + dLat, longitude: lon + dLon };
}

function wp(lat, lon, alt = 95, extra = {}) {
  return { latitude: lat, longitude: lon, altitude: alt, ...extra };
}

function buildShuttle(lat, lon, lengthM, alt) {
  const a = offsetMeters(lat, lon, 0, -lengthM / 2);
  const b = offsetMeters(lat, lon, 0, lengthM / 2);
  return [wp(a.latitude, a.longitude, alt), wp(b.latitude, b.longitude, alt)];
}

function buildCircleWaypoints(lat, lon, radiusM, pointCount, alt) {
  const waypoints = [];
  for (let i = 0; i < pointCount; i += 1) {
    const angle = (2 * Math.PI * i) / pointCount;
    const point = offsetMeters(lat, lon, radiusM * Math.cos(angle), radiusM * Math.sin(angle));
    waypoints.push(wp(point.latitude, point.longitude, alt));
  }
  return waypoints;
}

// --- SE-SIM-001: small circle near user-zone center ---
const CIRCLE_RADIUS_M = 70;
const userZoneCircle = buildCircleWaypoints(
  USER_ZONE_CENTER.latitude,
  USER_ZONE_CENTER.longitude,
  CIRCLE_RADIUS_M,
  16,
  100,
);

// --- SE-SIM-003 / 004: proximity + collision, 15 s cycle ---
const pairLat = 59.4335;
const pairLon = 17.651;
const pairShuttleLow = buildShuttle(pairLat, pairLon, PAIR_SHUTTLE_LENGTH_M, 90);
const pairShuttleHigh = buildShuttle(pairLat, pairLon, PAIR_SHUTTLE_LENGTH_M, 115);

// --- SE-SIM-005: continuous shuttle across BROMMA CTR SW corner ---
/**
 * Cross the SW corner of the real LFV BROMMA CTR polygon:
 *   [17.74666667, 59.24944444]
 * Diagonal: SW outside ↔ NE inside (no endpoint holds).
 */
const BROMMA_CTR_SW_CORNER = { latitude: 59.24944444, longitude: 17.74666667 };
const brommaOutside = offsetMeters(
  BROMMA_CTR_SW_CORNER.latitude,
  BROMMA_CTR_SW_CORNER.longitude,
  -800,
  -800,
);
const brommaInside = offsetMeters(
  BROMMA_CTR_SW_CORNER.latitude,
  BROMMA_CTR_SW_CORNER.longitude,
  800,
  800,
);
const redZoneRoute = [
  wp(brommaOutside.latitude, brommaOutside.longitude, 105, { legMs: 8_000 }),
  wp(brommaInside.latitude, brommaInside.longitude, 110, { legMs: 8_000 }),
];

/** @type {DemoRoute[]} */
export const NOTIFICATION_DEMO_ROUTES = [
  {
    id: 'demo-user-zone-circle',
    name: 'Demo — small circle (user zone area)',
    demoKind: 'USER_ZONE_CIRCLE',
    zoneLabel: 'Pilot user zone area',
    waypoints: userZoneCircle,
  },
  {
    id: 'demo-pair-low',
    name: 'Demo — pair shuttle A (90 m): proximity + collision',
    demoKind: 'PAIR_PROXIMITY_COLLISION',
    fleetPhaseMs: 0,
    cycleDurationMs: PAIR_CYCLE_MS,
    waypoints: pairShuttleLow,
  },
  {
    id: 'demo-pair-high',
    name: 'Demo — pair shuttle B (115 m): proximity + collision',
    demoKind: 'PAIR_PROXIMITY_COLLISION',
    fleetPhaseMs: PAIR_PHASE_OFFSET_MS,
    cycleDurationMs: PAIR_CYCLE_MS,
    waypoints: pairShuttleHigh,
  },
];

export const RED_ZONE_DEMO_ROUTE = {
  id: 'demo-bromma-ctr-pulse',
  name: 'Demo — BROMMA CTR corner shuttle',
  demoKind: 'RED_ZONE_PULSE',
  zoneType: 'CTR',
  zoneLabel: 'BROMMA CTR',
  waypoints: redZoneRoute,
};
