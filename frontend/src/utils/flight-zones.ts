import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';

const ZONE_STYLES: Record<string, { fill: string; stroke: string; dash?: number[] }> = {
  CTR: { fill: 'rgba(220, 38, 38, 0.2)', stroke: 'rgba(220, 38, 38, 0.9)' },
  RSTA: { fill: 'rgba(220, 38, 38, 0.2)', stroke: 'rgba(220, 38, 38, 0.9)' },
  ATZ: { fill: 'rgba(234, 88, 12, 0.2)', stroke: 'rgba(234, 88, 12, 0.9)' },
  NOTAM: { fill: 'rgba(147, 51, 234, 0.06)', stroke: 'rgba(147, 51, 234, 0.85)', dash: [8, 4] },
};

const DEFAULT_STYLE = { fill: 'rgba(234, 88, 12, 0.2)', stroke: 'rgba(234, 88, 12, 0.9)' };

export function zoneStyleForLayerType(layerType: string): Style {
  const cfg = ZONE_STYLES[layerType] ?? DEFAULT_STYLE;
  return new Style({
    fill: new Fill({ color: cfg.fill }),
    stroke: new Stroke({
      color: cfg.stroke,
      width: 2,
      lineDash: cfg.dash,
    }),
  });
}

export const ZONE_FILTER_TYPES = ['CTR', 'RSTA', 'ATZ', 'NOTAM'] as const;
export type ZoneFilterType = (typeof ZONE_FILTER_TYPES)[number];

export type ZoneFilters = Record<ZoneFilterType, boolean>;

export const DEFAULT_ZONE_FILTERS: ZoneFilters = {
  CTR: true,
  RSTA: true,
  ATZ: true,
  NOTAM: false,
};

export interface FlightZoneData {
  id: string;
  layerType: string;
  name?: string | null;
  description?: string | null;
  lowerLimit?: string | null;
  upperLimit?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export function applyZoneFeatureProps(feature: Feature<Geometry>, zone: FlightZoneData): void {
  feature.setId(zone.id);
  feature.set('zoneId', zone.id);
  feature.set('layerType', zone.layerType);
  feature.set('zoneName', zone.name);
  feature.set('zoneDescription', zone.description);
  feature.set('lowerLimit', zone.lowerLimit);
  feature.set('upperLimit', zone.upperLimit);
  feature.set('validFrom', zone.validFrom);
  feature.set('validTo', zone.validTo);
  feature.setStyle(zoneStyleForLayerType(zone.layerType));
}
