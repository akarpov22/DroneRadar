import type { ZoneFilterType } from '../../utils/flight-zones';

export interface FlightRestrictionZoneResult {
  id: string;
  layerType: string;
  name?: string | null;
  description?: string | null;
  lowerLimit?: string | null;
  upperLimit?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  geometry: object;
}

export const ZONE_TYPE_I18N: Record<ZoneFilterType, string> = {
  CTR: 'flight-zone-type-ctr',
  RSTA: 'flight-zone-type-rsta',
  ATZ: 'flight-zone-type-atz',
  NOTAM: 'flight-zone-type-notam',
};

export const MIN_ZOOM_FOR_ZONES = 8;
export const MAX_BBOX_SPAN = 2.5;
export const DEFAULT_MAP_ZOOM = 9;
export const MOVEEND_DEBOUNCE_MS = 500;
