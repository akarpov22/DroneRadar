/**
 * Stockholm flight restriction zones (LFV WFS).
 * Routes start outside a zone and cross its boundary twice per lap.
 */

/** @typedef {{ west: number, south: number, east: number, north: number }} ZoneBbox */
/** @typedef {{ latitude: number, longitude: number, altitude: number }} Waypoint */
/** @typedef {'CTR' | 'RSTA' | 'ATZ' | 'NOTAM'} ZoneType */

const MARGIN_DEG = 0.0035;

/** @type {Record<string, ZoneBbox>} */
export const STOCKHOLM_PARENT_ZONES = {
  BROMMA_CTR: { west: 17.69667, south: 59.24944, east: 18.16333, north: 59.44139 },
  SECTOR_EAST: { west: 17.88389, south: 59.49111, east: 18.32139, north: 59.81611 },
  ARLANDA_CTR: { west: 17.69667, south: 59.49111, east: 18.32139, north: 59.81611 },
  ESSA_NOTAM: { west: 17.75249, south: 59.56688, east: 18.08085, north: 59.73306 },
  ESHD_NOTAM: { west: 17.87044, south: 59.30021, east: 18.19622, north: 59.46639 },
};

/**
 * @param {'ns' | 'ew' | 'diag-ne' | 'diag-nw'} pattern
 * @param {ZoneBbox} zone
 * @param {number} baseAlt
 * @param {number} margin
 * @returns {Waypoint[]}
 */
function crossingWaypoints(pattern, zone, baseAlt, margin = MARGIN_DEG) {
  const cx = (zone.west + zone.east) / 2;
  const cy = (zone.south + zone.north) / 2;
  const halfH = (zone.north - zone.south) / 2;
  const halfW = (zone.east - zone.west) / 2;
  const inside = (lat, lon, alt = baseAlt + 12) => ({ latitude: lat, longitude: lon, altitude: alt });
  const outside = (lat, lon, alt = baseAlt) => ({ latitude: lat, longitude: lon, altitude: alt });

  switch (pattern) {
    case 'ns':
      return [
        outside(cy - halfH - margin, cx),
        inside(cy, cx),
        outside(cy + halfH + margin, cx),
        inside(cy, cx),
      ];
    case 'ew':
      return [
        outside(cy, zone.west - margin),
        inside(cy, cx),
        outside(cy, zone.east + margin),
        inside(cy, cx),
      ];
    case 'diag-ne':
      return [
        outside(zone.south - margin, zone.west - margin),
        inside(cy, cx),
        outside(zone.north + margin, zone.east + margin),
        inside(cy, cx),
      ];
    case 'diag-nw':
      return [
        outside(zone.south - margin, zone.east + margin),
        inside(cy, cx),
        outside(zone.north + margin, zone.west - margin),
        inside(cy, cx),
      ];
    default:
      return crossingWaypoints('ns', zone, baseAlt, margin);
  }
}

/**
 * @param {ZoneBbox} parent
 * @param {'north' | 'south' | 'east' | 'west'} edge
 * @param {number} halfSpan
 */
function edgeStraddleBbox(parent, edge, halfSpan = 0.012) {
  const cx = (parent.west + parent.east) / 2;
  const cy = (parent.south + parent.north) / 2;
  const strip = 0.006;

  switch (edge) {
    case 'north':
      return { west: cx - halfSpan, east: cx + halfSpan, south: parent.north - strip, north: parent.north + strip };
    case 'south':
      return { west: cx - halfSpan, east: cx + halfSpan, south: parent.south - strip, north: parent.south + strip };
    case 'east':
      return { west: parent.east - strip, east: parent.east + strip, south: cy - halfSpan, north: cy + halfSpan };
    case 'west':
      return { west: parent.west - strip, east: parent.west + strip, south: cy - halfSpan, north: cy + halfSpan };
    default:
      return parent;
  }
}

/**
 * @param {{ id: string, name: string, zone: ZoneBbox, zoneLabel: string, zoneType: ZoneType, pattern?: 'ns' | 'ew' | 'diag-ne' | 'diag-nw', altitude?: number, margin?: number, reverse?: boolean }} spec
 */
export function buildZoneCrossingRoute(spec) {
  const {
    id,
    name,
    zone,
    zoneLabel,
    zoneType,
    pattern = 'ns',
    altitude = 95,
    margin = MARGIN_DEG,
    reverse = false,
  } = spec;

  let waypoints = crossingWaypoints(pattern, zone, altitude, margin);
  if (reverse) {
    waypoints = [...waypoints].reverse();
  }

  return {
    id,
    name,
    zoneLabel,
    zoneType,
    waypoints,
  };
}

/**
 * Interleaved by zone type so a fleet of 4+ drones covers CTR, RSTA, ATZ, NOTAM.
 * @type {Array<{ id: string, label: string, zoneType: ZoneType, bbox?: ZoneBbox | null, parent?: ZoneBbox, parentKey?: keyof typeof STOCKHOLM_PARENT_ZONES, edge?: 'north' | 'south' | 'east' | 'west', pattern?: 'ns' | 'ew' | 'diag-ne' | 'diag-nw', altitude?: number, reverse?: boolean }>}
 */
const STOCKHOLM_ZONE_SPECS = [
  {
    id: 'rsta-r127',
    label: 'ES R127',
    zoneType: 'RSTA',
    bbox: { west: 17.99427, south: 59.34418, east: 18.02684, north: 59.36081 },
    pattern: 'ns',
    altitude: 100,
  },
  {
    id: 'ctr-bromma-south',
    label: 'BROMMA CTR',
    zoneType: 'CTR',
    parentKey: 'BROMMA_CTR',
    edge: 'south',
    pattern: 'ew',
    altitude: 90,
  },
  {
    id: 'atz-skaedeby',
    label: 'SKÅ-EDEBY ATZ',
    zoneType: 'ATZ',
    bbox: { west: 17.69667, south: 59.32444, east: 17.79055, north: 59.36611 },
    pattern: 'diag-nw',
    altitude: 130,
  },
  {
    id: 'notam-essb-a',
    label: 'NOTAM ESSB',
    zoneType: 'NOTAM',
    bbox: { west: 17.96829, south: 59.28342, east: 18.09837, north: 59.34992 },
    pattern: 'diag-ne',
    altitude: 85,
  },
  {
    id: 'rsta-r94',
    label: 'ES R94',
    zoneType: 'RSTA',
    bbox: { west: 17.97508, south: 59.38835, east: 18.00769, north: 59.40498 },
    pattern: 'diag-nw',
    altitude: 110,
  },
  {
    id: 'ctr-bromma-west',
    label: 'BROMMA CTR',
    zoneType: 'CTR',
    parentKey: 'BROMMA_CTR',
    edge: 'west',
    pattern: 'diag-ne',
    altitude: 95,
  },
  {
    id: 'rsta-r102',
    label: 'ES R102',
    zoneType: 'RSTA',
    bbox: { west: 18.02131, south: 59.35491, east: 18.05647, north: 59.37286 },
    pattern: 'diag-ne',
    altitude: 105,
  },
  {
    id: 'notam-eshd-south',
    label: 'NOTAM ESHD',
    zoneType: 'NOTAM',
    parentKey: 'ESHD_NOTAM',
    edge: 'south',
    pattern: 'diag-ne',
    altitude: 120,
  },
  {
    id: 'rsta-r113',
    label: 'ES R113',
    zoneType: 'RSTA',
    bbox: { west: 18.02806, south: 59.32056, east: 18.08583, north: 59.3375 },
    pattern: 'diag-nw',
    altitude: 92,
  },
  {
    id: 'ctr-sector-east-south',
    label: 'Sector East CTR',
    zoneType: 'CTR',
    parentKey: 'SECTOR_EAST',
    edge: 'south',
    pattern: 'ns',
    altitude: 140,
  },
  {
    id: 'rsta-r24',
    label: 'ES R24',
    zoneType: 'RSTA',
    bbox: { west: 17.83988, south: 59.30427, east: 17.91012, north: 59.34016 },
    pattern: 'ns',
    altitude: 115,
  },
  {
    id: 'notam-essb-b',
    label: 'NOTAM ESSB',
    zoneType: 'NOTAM',
    bbox: { west: 18.01825, south: 59.30008, east: 18.14841, north: 59.36658 },
    pattern: 'diag-ne',
    altitude: 88,
    reverse: true,
  },
  {
    id: 'ctr-arlanda-west',
    label: 'ARLANDA CTR',
    zoneType: 'CTR',
    parentKey: 'ARLANDA_CTR',
    edge: 'west',
    pattern: 'ew',
    altitude: 150,
  },
  {
    id: 'rsta-r16a',
    label: 'ES R16A',
    zoneType: 'RSTA',
    bbox: { west: 17.73444, south: 59.58, east: 17.78806, north: 59.59417 },
    pattern: 'ew',
    altitude: 125,
  },
  {
    id: 'notam-essa-south',
    label: 'NOTAM ESSA',
    zoneType: 'NOTAM',
    parentKey: 'ESSA_NOTAM',
    edge: 'south',
    pattern: 'ns',
    altitude: 160,
  },
  {
    id: 'ctr-bromma-north',
    label: 'BROMMA CTR',
    zoneType: 'CTR',
    parentKey: 'BROMMA_CTR',
    edge: 'north',
    pattern: 'diag-nw',
    altitude: 100,
  },
];

function resolveBbox(spec) {
  if (spec.bbox) return spec.bbox;
  const parent = spec.parent ?? STOCKHOLM_PARENT_ZONES[spec.parentKey];
  return edgeStraddleBbox(parent, spec.edge);
}

export const FLIGHT_ZONES = STOCKHOLM_ZONE_SPECS.map((spec) => ({
  ...spec,
  city: 'Stockholm',
  bbox: resolveBbox(spec),
}));

/** @type {import('./zone-routes.js').ZoneType[]} */
export const STOCKHOLM_ZONE_TYPES = ['RSTA', 'CTR', 'ATZ', 'NOTAM'];

export const ZONE_CROSSING_ROUTES = FLIGHT_ZONES.map((zone) =>
  buildZoneCrossingRoute({
    id: `zone-${zone.id}`,
    name: `Stockholm — ${zone.zoneType} ${zone.label}`,
    zone: zone.bbox,
    zoneLabel: zone.label,
    zoneType: zone.zoneType,
    pattern: zone.pattern,
    altitude: zone.altitude,
    reverse: zone.reverse,
  }),
);
