import { Feature } from 'ol';
import { Geometry, LineString, Point } from 'ol/geom';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat } from 'ol/proj';
import {
  applyZoneFeatureProps,
  type ZoneFilters,
  type ZoneFilterType,
} from '../../utils/flight-zones';
import { getCurrentSession, getDroneLatestPosition } from '../../utils/drone';
import type { Drone } from '../../utils/types';
import type { FlightRestrictionZoneResult } from './types';

const geoJsonFormat = new GeoJSON();
const degreesToRadians = (degrees: number) => degrees * Math.PI / 180;

export function zonesToFeatures(
  zones: FlightRestrictionZoneResult[],
  filters: ZoneFilters,
): Feature<Geometry>[] {
  return zones
    .filter((zone) => filters[zone.layerType as ZoneFilterType] ?? filters.RSTA)
    .flatMap((zone) => {
      const parsed = geoJsonFormat.readFeatures(
        { type: 'Feature', geometry: zone.geometry, properties: {} },
        { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
      ) as Feature<Geometry>[];
      parsed.forEach((feature) => applyZoneFeatureProps(feature, zone));
      return parsed;
    });
}

export function formatZoneTooltip(feature: Feature<Geometry>): string {
  const parts = [
    feature.get('zoneName') || feature.get('layerType'),
    feature.get('zoneDescription'),
    feature.get('lowerLimit') && feature.get('upperLimit')
      ? `${feature.get('lowerLimit')} – ${feature.get('upperLimit')}`
      : null,
    feature.get('validFrom') && feature.get('validTo')
      ? `${feature.get('validFrom')} – ${feature.get('validTo')}`
      : null,
  ].filter(Boolean);
  return parts.join('\n');
}

function isDroneExpired(recordedAt?: string): boolean {
  if (!recordedAt) return false;
  return Date.now() - new Date(recordedAt).getTime() > 60_000;
}

function createDroneStyle(heading: number, selected: boolean): Style {
  return new Style({
    image: new Icon({
      anchor: [0.5, 1],
      scale: 0.02,
      src: '/assets/drone.png',
      rotation: degreesToRadians(heading),
      color: selected ? '#ffff00' : undefined,
    }),
  });
}

function getOwnedSerials(): string[] {
  return JSON.parse(localStorage.getItem('myDrones') ?? '[]');
}

function isDroneVisible(drone: Drone, isDisplayOwned: boolean, ownedSerials: string[]): boolean {
  const position = getDroneLatestPosition(drone);
  if (isDroneExpired(position?.recordedAt)) return false;
  if (isDisplayOwned && drone.serial && !ownedSerials.includes(drone.serial)) return false;
  return true;
}

export function buildDroneFeatures(
  drones: Drone[],
  isDisplayOwned: boolean,
  selectedDroneId?: number,
): Feature<Point>[] {
  const ownedSerials = getOwnedSerials();
  const features: Feature<Point>[] = [];

  for (const drone of drones) {
    if (!isDroneVisible(drone, isDisplayOwned, ownedSerials)) continue;

    const position = getDroneLatestPosition(drone)!;
    const feature = new Feature({
      geometry: new Point(fromLonLat([position.longitude, position.latitude])),
    });
    feature.set('droneId', drone.id);
    feature.set('droneSerial', drone.serial);
    feature.setStyle(createDroneStyle(
      position.heading ?? 0,
      selectedDroneId === drone.id,
    ));
    features.push(feature);
  }

  return features;
}

export function buildDronePathFeature(
  drones: Drone[],
  selectedDroneId: number | undefined,
  isDisplayOwned: boolean,
): Feature<LineString> | null {
  if (selectedDroneId == null) return null;

  const ownedSerials = getOwnedSerials();
  const drone = drones.find((d) => d.id === selectedDroneId);
  if (
    !drone ||
    (isDisplayOwned && drone.serial && !ownedSerials.includes(drone.serial))
  ) {
    return null;
  }

  const session = getCurrentSession(drone.sessions);
  const path = session?.positions.map((p) => fromLonLat([p.longitude, p.latitude])) ?? [];
  if (path.length === 0) return null;

  const lineFeature = new Feature({ geometry: new LineString(path) });
  lineFeature.set('droneId', drone.id);
  lineFeature.set('droneSerial', drone.serial);
  lineFeature.setStyle(new Style({ stroke: new Stroke({ color: 'red', width: 3 }) }));
  return lineFeature;
}
