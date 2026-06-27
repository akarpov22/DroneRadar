import { ZONE_CROSSING_ROUTES } from './zone-routes.js';

/**
 * Each simulator instance = one drone on a closed loop route.
 * Routes start just outside LFV restriction zones and cross boundaries every lap.
 */
export const ROUTES = ZONE_CROSSING_ROUTES;

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
