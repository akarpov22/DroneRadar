/**
 * Demo routes — minimum fleet to cover every notification type.
 *
 * User zone (UI): circle 400 m around USER_ZONE_CENTER.
 * Fleet: 4 demo + 1 Stockholm = 5 drones (npm start).
 */

import { toRadians } from './geo.js';

/** @typedef {{ latitude: number, longitude: number, altitude: number }} Waypoint */
/** @typedef {{ id: string, name: string, demoKind: string, zoneLabel?: string, zoneType?: string, fleetPhaseMs?: number, waypoints: Waypoint[] }} DemoRoute */

export const USER_ZONE_CENTER = {
  latitude: 59.435536,
  longitude: 17.648498,
};

export const USER_ZONE_RADIUS_M = 400;

/** Pair offset so drones stay ~40 m apart on a shared shuttle (proximity, not stacked). */
export const PAIR_PHASE_OFFSET_MS = 8_000;

const BROMMA_CTR_WEST_LON = 17.69667;

function offsetMeters(lat, lon, northM, eastM) {
  const dLat = (northM / 6371000) * (180 / Math.PI);
  const dLon = (eastM / (6371000 * Math.cos(toRadians(lat)))) * (180 / Math.PI);
  return { latitude: lat + dLat, longitude: lon + dLon };
}

function wp(lat, lon, alt = 95) {
  return { latitude: lat, longitude: lon, altitude: alt };
}

function buildShuttle(lat, lon, lengthM, alt) {
  const a = offsetMeters(lat, lon, 0, -lengthM / 2);
  const b = offsetMeters(lat, lon, 0, lengthM / 2);
  return [wp(a.latitude, a.longitude, alt), wp(b.latitude, b.longitude, alt)];
}

// --- 0: USER_ZONE enter / exit ---
const userZoneNorth = offsetMeters(
  USER_ZONE_CENTER.latitude,
  USER_ZONE_CENTER.longitude,
  USER_ZONE_RADIUS_M + 150,
  0,
);
const userZoneSouth = offsetMeters(
  USER_ZONE_CENTER.latitude,
  USER_ZONE_CENTER.longitude,
  -(USER_ZONE_RADIUS_M + 150),
  0,
);
const userZoneRoute = [
  wp(userZoneNorth.latitude, userZoneNorth.longitude, 100),
  wp(USER_ZONE_CENTER.latitude, USER_ZONE_CENTER.longitude, 100),
  wp(userZoneSouth.latitude, userZoneSouth.longitude, 100),
];

// --- 1: ZONE_APPROACH then ZONE_ENTER (single Bromma CTR lap) ---
const ctrLat = 59.383;
const ctrApproach = offsetMeters(ctrLat, BROMMA_CTR_WEST_LON, 0, -90);
const ctrOutside = offsetMeters(ctrLat, BROMMA_CTR_WEST_LON, 0, -320);
const ctrInside = offsetMeters(ctrLat, BROMMA_CTR_WEST_LON, 0, 220);
const zoneCombinedRoute = [
  wp(ctrOutside.latitude, ctrOutside.longitude, 105),
  wp(ctrApproach.latitude, ctrApproach.longitude, 105),
  wp(ctrInside.latitude, ctrInside.longitude, 110),
  wp(ctrOutside.latitude, ctrOutside.longitude, 110),
];

// --- 2–3: DRONE_PROXIMITY + COLLISION_ALTITUDE (one pair, shared shuttle, different alt & phase) ---
const pairLat = 59.4335;
const pairLon = 17.651;
const pairShuttleLow = buildShuttle(pairLat, pairLon, 70, 90);
const pairShuttleHigh = buildShuttle(pairLat, pairLon, 70, 115);

/** @type {DemoRoute[]} */
export const NOTIFICATION_DEMO_ROUTES = [
  {
    id: 'demo-user-zone',
    name: 'Demo — user zone enter/exit',
    demoKind: 'USER_ZONE_ENTER_EXIT',
    zoneLabel: 'Pilot user zone (create in UI)',
    waypoints: userZoneRoute,
  },
  {
    id: 'demo-zone-combined',
    name: 'Demo — Bromma CTR approach + enter',
    demoKind: 'ZONE_APPROACH_AND_ENTER',
    zoneType: 'CTR',
    zoneLabel: 'Bromma CTR',
    waypoints: zoneCombinedRoute,
  },
  {
    id: 'demo-pair-low',
    name: 'Demo — pair shuttle A (90 m): proximity + collision',
    demoKind: 'PAIR_PROXIMITY_COLLISION',
    fleetPhaseMs: 0,
    waypoints: pairShuttleLow,
  },
  {
    id: 'demo-pair-high',
    name: 'Demo — pair shuttle B (115 m): proximity + collision',
    demoKind: 'PAIR_PROXIMITY_COLLISION',
    fleetPhaseMs: PAIR_PHASE_OFFSET_MS,
    waypoints: pairShuttleHigh,
  },
];
