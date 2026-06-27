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

export function applyDroneFeatureStyle(
  feature: Feature<Point>,
  heading: number,
  selected: boolean,
): void {
  let style = feature.get('droneStyle') as Style | undefined;
  const wasSelected = feature.get('droneSelected') as boolean | undefined;

  if (!style || wasSelected !== selected) {
    style = createDroneStyle(heading, selected);
    feature.set('droneStyle', style);
    feature.set('droneSelected', selected);
    feature.setStyle(style);
    return;
  }

  const icon = style.getImage();
  if (icon instanceof Icon) {
    icon.setRotation(degreesToRadians(heading));
    feature.changed();
  }
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
  selectedDroneId: string | undefined,
  isDisplayOwned: boolean,
  trailEnd?: { longitude: number; latitude: number },
  pathCutoffRecordedAt?: string,
): Feature<LineString> | null {
  const coordinates = buildDronePathCoordinates(
    drones,
    selectedDroneId,
    isDisplayOwned,
    trailEnd,
    pathCutoffRecordedAt,
  );
  if (!coordinates) return null;

  const lineFeature = new Feature({ geometry: new LineString(coordinates) });
  const drone = drones.find((d) => d.id === selectedDroneId);
  if (drone) {
    lineFeature.set('droneId', drone.id);
    lineFeature.set('droneSerial', drone.serial);
  }
  lineFeature.setStyle(new Style({ stroke: new Stroke({ color: 'red', width: 3 }) }));
  return lineFeature;
}

export function buildDronePathCoordinates(
  drones: Drone[],
  selectedDroneId: string | undefined,
  isDisplayOwned: boolean,
  trailEnd?: { longitude: number; latitude: number },
  pathCutoffRecordedAt?: string,
): number[][] | null {
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
  const positions = session?.positions ?? [];
  if (positions.length === 0) return null;

  let included = positions;
  if (trailEnd && pathCutoffRecordedAt) {
    const cutoffMs = new Date(pathCutoffRecordedAt).getTime();
    included = positions.filter((p) => new Date(p.recordedAt).getTime() <= cutoffMs);
  } else if (trailEnd) {
    included = positions.slice(0, -1);
  }

  const coordinates = included.map((p) => fromLonLat([p.longitude, p.latitude]));
  if (trailEnd) {
    const trailCoord = fromLonLat([trailEnd.longitude, trailEnd.latitude]);
    const last = coordinates.at(-1);
    if (!last || last[0] !== trailCoord[0] || last[1] !== trailCoord[1]) {
      coordinates.push(trailCoord);
    }
  }

  if (coordinates.length === 0) return null;

  return coordinates;
}
