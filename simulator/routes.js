import { buildDroneSerial } from './serials.js';
import { NOTIFICATION_DEMO_ROUTES, RED_ZONE_DEMO_ROUTE } from './notification-routes.js';

/** @typedef {import('./notification-routes.js').DemoRoute} DemoRoute */

/**
 * Fleet plan: serial indices skip SE-SIM-002.
 * routeIndex maps into ROUTES below.
 */
export const FLEET_PLAN = [
  { serialIndex: 0, routeIndex: 0 }, // SE-SIM-001 — circle
  { serialIndex: 2, routeIndex: 1 }, // SE-SIM-003 — pair low
  { serialIndex: 3, routeIndex: 2 }, // SE-SIM-004 — pair high
  { serialIndex: 4, routeIndex: 3 }, // SE-SIM-005 — red zone pulse
];

/** 3 demo + 1 red-zone pulse = 4 routes / 4 drones. */
export const ROUTES = [...NOTIFICATION_DEMO_ROUTES, RED_ZONE_DEMO_ROUTE];

export const DEMO_ROUTE_COUNT = NOTIFICATION_DEMO_ROUTES.length;
export const FLEET_SIZE = FLEET_PLAN.length;

/** @type {Array<{ index: number, serial: string, routeIndex: number, routeId: string, routeName: string, tests: string, register: boolean }>} */
export const FLEET_CATALOG = FLEET_PLAN.map((entry) => {
  const route = ROUTES[entry.routeIndex];
  const testsByKind = {
    USER_ZONE_CIRCLE:
      'Малый круг (~70 м) вокруг 59.435536, 17.648498',
    PAIR_PROXIMITY_COLLISION:
      'DRONE_PROXIMITY + COLLISION_ALTITUDE — цикл 15 с (расходятся → пересекаются → назад)',
    RED_ZONE_PULSE:
      'ZONE_ENTER — вне BROMMA CTR → каждые 10 с вход, 5 с внутри, выход на старт',
  };

  return {
    index: entry.serialIndex,
    serial: buildDroneSerial(entry.serialIndex),
    routeIndex: entry.routeIndex,
    routeId: route.id,
    routeName: route.name,
    tests: testsByKind[route.demoKind] ?? route.name,
    register: true,
  };
});

export function printFleetCatalog(regionCode = 'SE') {
  console.log(`[fleet] ${FLEET_SIZE} drones (SE-SIM-002 disabled)`);
  console.log('[fleet] Active serials:');
  for (const entry of FLEET_CATALOG) {
    const serial = buildDroneSerial(entry.index, regionCode);
    console.log(`  ${serial}  route #${entry.routeIndex}  —  ${entry.tests}`);
  }
}

export function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveRouteIndex(serial, explicitIndex) {
  if (explicitIndex !== undefined && explicitIndex !== '') {
    const parsed = Number(explicitIndex);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`ROUTE_INDEX must be a non-negative integer, got: ${explicitIndex}`);
    }
    return parsed % ROUTES.length;
  }

  const match = /^[A-Z]{2}-SIM-(\d+)$/i.exec(serial ?? '');
  if (match) {
    const serialIndex = Number(match[1]) - 1;
    const planned = FLEET_PLAN.find((entry) => entry.serialIndex === serialIndex);
    if (planned) return planned.routeIndex;
  }

  return hashString(serial) % ROUTES.length;
}

export function getRouteByIndex(index) {
  return ROUTES[index % ROUTES.length];
}

export function getFleetEntry(fleetSlot) {
  return FLEET_PLAN[fleetSlot % FLEET_PLAN.length];
}
