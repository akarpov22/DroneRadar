import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';

const USER_ZONE_STYLE = {
  fill: 'rgba(234, 179, 8, 0.25)',
  stroke: 'rgba(202, 138, 4, 0.95)',
};

export type UserZoneShapeType = 'POLYGON' | 'RECTANGLE' | 'CIRCLE';

export interface UserZoneResult {
  id: string;
  name?: string | null;
  shapeType: UserZoneShapeType;
  geometry: Record<string, unknown>;
  createdAt?: string;
}

export function getZoneDisplayName(
  zone: UserZoneResult,
  zones: UserZoneResult[],
  defaultLabel: (index: number) => string,
): string {
  const trimmed = zone.name?.trim();
  if (trimmed) return trimmed;

  const unnamedSorted = zones
    .filter((z) => !z.name?.trim())
    .sort(
      (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
    );

  const index = unnamedSorted.findIndex((z) => z.id === zone.id) + 1;
  return defaultLabel(index > 0 ? index : 1);
}

export function createUserZoneStyle(selected = false): Style {
  return new Style({
    fill: new Fill({ color: USER_ZONE_STYLE.fill }),
    stroke: new Stroke({
      color: selected ? '#b45309' : USER_ZONE_STYLE.stroke,
      width: selected ? 3 : 2,
    }),
  });
}

export function applyUserZoneFeatureProps(
  feature: Feature<Geometry>,
  zone: UserZoneResult,
  selected = false,
): void {
  feature.set('userZoneId', zone.id);
  feature.set('userZoneName', zone.name);
  feature.set('userZoneShapeType', zone.shapeType);
  feature.setStyle(createUserZoneStyle(selected));
}
