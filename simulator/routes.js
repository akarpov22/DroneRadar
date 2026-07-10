import { buildDroneSerial } from './serials.js';
import { NOTIFICATION_DEMO_ROUTES } from './notification-routes.js';
import { ZONE_CROSSING_ROUTES } from './zone-routes.js';

/** @typedef {import('./notification-routes.js').DemoRoute} DemoRoute */

/** One background Stockholm patrol route. */
export const STOCKHOLM_PATROL_ROUTES = [
  {
    id: ZONE_CROSSING_ROUTES[0].id,
    name: `Stockholm patrol — ${ZONE_CROSSING_ROUTES[0].name}`,
    demoKind: 'STOCKHOLM_PATROL',
    zoneType: ZONE_CROSSING_ROUTES[0].zoneType,
    zoneLabel: ZONE_CROSSING_ROUTES[0].zoneLabel,
    waypoints: ZONE_CROSSING_ROUTES[0].waypoints,
  },
];

export const DEMO_ROUTE_COUNT = NOTIFICATION_DEMO_ROUTES.length;
export const FLEET_SIZE = DEMO_ROUTE_COUNT + STOCKHOLM_PATROL_ROUTES.length;

/** 4 demo + 1 Stockholm = 5 drones. */
export const ROUTES = [...NOTIFICATION_DEMO_ROUTES, ...STOCKHOLM_PATROL_ROUTES];

/** @type {Array<{ index: number, serial: string, routeIndex: number, routeId: string, routeName: string, tests: string, register: boolean }>} */
export const FLEET_CATALOG = ROUTES.map((route, routeIndex) => {
  const testsByKind = {
    USER_ZONE_ENTER_EXIT:
      'USER_ZONE_ENTER / USER_ZONE_EXIT — круг 400 м вокруг 59.435536, 17.648498',
    ZONE_APPROACH_AND_ENTER:
      'ZONE_APPROACH + ZONE_ENTER — Bromma CTR (сначала ≤100 м, затем вход)',
    PAIR_PROXIMITY_COLLISION:
      'DRONE_PROXIMITY + COLLISION_ALTITUDE — парный дрон (смещение по фазе, не наслоение)',
    STOCKHOLM_PATROL: 'Патруль Stockholm (фон, без демо-уведомлений)',
  };

  const isDemo = route.demoKind !== 'STOCKHOLM_PATROL';

  return {
    index: routeIndex,
    serial: buildDroneSerial(routeIndex),
    routeIndex,
    routeId: route.id,
    routeName: route.name,
    tests: testsByKind[route.demoKind] ?? route.name,
    register: isDemo,
  };
});

export function printFleetCatalog(regionCode = 'SE') {
  console.log(`[fleet] ${FLEET_SIZE} drones (${DEMO_ROUTE_COUNT} demo + ${STOCKHOLM_PATROL_ROUTES.length} Stockholm)`);
  console.log('[fleet] Register SE-SIM-001 … SE-SIM-004 in UI for notifications:');
  for (const entry of FLEET_CATALOG) {
    const serial = buildDroneSerial(entry.index, regionCode);
    console.log(`  ${serial}  route #${entry.routeIndex}  —  ${entry.tests}`);
  }
  console.log('[fleet] User zone for SE-SIM-001: circle 400 m at 59.435536, 17.648498');
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
  return hashString(serial) % ROUTES.length;
}

export function getRouteByIndex(index) {
  return ROUTES[index % ROUTES.length];
}
