const LFV_WFS = 'https://daim.lfv.se/geoserver/wfs';
const FETCH_TIMEOUT_MS = 30_000;

export const STATIC_LAYERS = ['mais:CTR', 'mais:RSTA', 'mais:ATZ'] as const;
export const NOTAM_LAYER = 'dynais:NOTAM';
export const ALL_LAYERS = [...STATIC_LAYERS, NOTAM_LAYER] as const;

/** Bounding box covering Sweden (WGS84). */
export const SWEDEN_BBOX = [10, 55, 24, 69] as const;

const MAX_NOTAM_GEOMETRY_SPAN = 0.25;

export type Bbox = [west: number, south: number, east: number, north: number];

export interface NormalizedZone {
  id: string;
  sourceLayer: string;
  layerType: string;
  name: string | null;
  description: string | null;
  lowerLimit: string | null;
  upperLimit: string | null;
  validFrom: string | null;
  validTo: string | null;
  geometry: Record<string, unknown>;
  west: number;
  south: number;
  east: number;
  north: number;
}

interface WfsFeature {
  id?: string;
  geometry?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

interface WfsResponse {
  features?: WfsFeature[];
}

function layerTypeFromTypename(typename: string): string {
  return typename.split(':')[1] ?? typename;
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export function computeGeometryBbox(geometry: Record<string, unknown>): {
  west: number;
  south: number;
  east: number;
  north: number;
} | null {
  const coords = geometry.coordinates;
  if (!Array.isArray(coords)) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const visit = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      minX = Math.min(minX, value[0]);
      maxX = Math.max(maxX, value[0]);
      minY = Math.min(minY, value[1]);
      maxY = Math.max(maxY, value[1]);
      return;
    }
    value.forEach(visit);
  };

  visit(coords);
  if (!Number.isFinite(minX)) return null;
  return { west: minX, south: minY, east: maxX, north: maxY };
}

function geometrySpan(geometry: Record<string, unknown>): number | null {
  const bbox = computeGeometryBbox(geometry);
  if (!bbox) return null;
  return Math.max(bbox.east - bbox.west, bbox.north - bbox.south);
}

function normalizeFeature(feature: WfsFeature, typename: string): NormalizedZone | null {
  if (!feature.geometry || !feature.id) return null;

  const span = geometrySpan(feature.geometry);
  const isNotam = typename === NOTAM_LAYER;
  if (span != null && isNotam && span > MAX_NOTAM_GEOMETRY_SPAN) return null;

  const bbox = computeGeometryBbox(feature.geometry);
  if (!bbox) return null;

  const props = feature.properties ?? {};
  const layerType = str(props.TYPEOFAREA) ?? layerTypeFromTypename(typename);

  if (typename === NOTAM_LAYER) {
    return {
      id: String(feature.id),
      sourceLayer: typename,
      layerType: 'NOTAM',
      name: str(props.ITEM_A),
      description: str(props.ITEM_E),
      lowerLimit: str(props.ITEM_F) ?? str(props.LOWER),
      upperLimit: str(props.ITEM_G) ?? str(props.UPPER),
      validFrom: str(props.STARTVALIDITY),
      validTo: str(props.ENDVALIDITY),
      geometry: feature.geometry,
      ...bbox,
    };
  }

  return {
    id: String(feature.id),
    sourceLayer: typename,
    layerType,
    name: str(props.NAMEOFAREA) ?? str(props.LOCATION),
    description: str(props.COMMENT_1) ?? str(props.COMMENT_2),
    lowerLimit: str(props.LOWER),
    upperLimit: str(props.UPPER),
    validFrom: null,
    validTo: null,
    geometry: feature.geometry,
    ...bbox,
  };
}

function buildWfsUrl(typename: string, bbox: Bbox, maxFeatures: number): string {
  const [west, south, east, north] = bbox;
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.1.0',
    request: 'GetFeature',
    typename,
    outputFormat: 'application/json',
    srsname: 'EPSG:4326',
    bbox: `${west},${south},${east},${north},EPSG:4326`,
    maxFeatures: String(maxFeatures),
  });
  return `${LFV_WFS}?${params}`;
}

export async function fetchLfvLayer(
  typename: string,
  bbox: Bbox,
  maxFeatures = 2000,
): Promise<NormalizedZone[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(buildWfsUrl(typename, bbox, maxFeatures), {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`LFV WFS ${typename} returned ${response.status}`);
    }
    const data = (await response.json()) as WfsResponse;
    return (data.features ?? [])
      .map((f) => normalizeFeature(f, typename))
      .filter((z): z is NormalizedZone => z !== null);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAllLfvZones(bbox: Bbox = [...SWEDEN_BBOX]): Promise<NormalizedZone[]> {
  const results = await Promise.all(
    ALL_LAYERS.map((layer) => fetchLfvLayer(layer, bbox)),
  );
  return results.flat();
}
