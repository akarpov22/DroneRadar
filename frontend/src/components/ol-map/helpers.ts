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
import {
  applyUserZoneFeatureProps,
  type UserZoneResult,
} from '../../utils/user-zones';
import { getCurrentSession, getDroneLatestPosition, isDroneRegistered } from '../../utils/drone';
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

export function userZonesToFeatures(
  zones: UserZoneResult[],
  selectedZoneId?: string | null,
): Feature<Geometry>[] {
  return zones.flatMap((zone) => {
    const parsed = geoJsonFormat.readFeatures(
      { type: 'Feature', geometry: zone.geometry, properties: {} },
      { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
    ) as Feature<Geometry>[];
    parsed.forEach((feature) => applyUserZoneFeatureProps(
      feature,
      zone,
      zone.id === selectedZoneId,
    ));
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

export function applyDroneFeatureStyle(
  feature: Feature<Point>,
  heading: number,
  selected: boolean,
  lostSignal = false,
): void {
  let style = feature.get('droneStyle') as Style | undefined;
  const wasSelected = feature.get('droneSelected') as boolean | undefined;
  const wasLostSignal = feature.get('droneLostSignal') as boolean | undefined;

  if (!style || wasSelected !== selected || wasLostSignal !== lostSignal) {
    style = createDroneStyle(heading, selected, lostSignal);
    feature.set('droneStyle', style);
    feature.set('droneSelected', selected);
    feature.set('droneLostSignal', lostSignal);
    feature.setStyle(style);
    return;
  }

  const icon = style.getImage();
  if (icon instanceof Icon) {
    icon.setRotation(degreesToRadians(heading));
    feature.changed();
  }
}

function createDroneStyle(heading: number, selected: boolean, lostSignal: boolean): Style {
  let color: string | undefined;
  if (lostSignal) {
    color = '#ef4444';
  } else if (selected) {
    color = '#ffff00';
  }

  return new Style({
    image: new Icon({
      anchor: [0.5, 1],
      scale: 0.02,
      src: '/assets/drone.png',
      rotation: degreesToRadians(heading),
      color,
    }),
  });
}

function isDroneVisible(drone: Drone): boolean {
  if (!isDroneRegistered(drone)) return false;
  return getDroneLatestPosition(drone) != null;
}

export function buildDroneFeatures(
  drones: Drone[],
  selectedDroneId?: number,
): Feature<Point>[] {
  const features: Feature<Point>[] = [];

  for (const drone of drones) {
    if (!isDroneVisible(drone)) continue;

    const position = getDroneLatestPosition(drone)!;
    const feature = new Feature({
      geometry: new Point(fromLonLat([position.longitude, position.latitude])),
    });
    feature.set('droneId', drone.id);
    feature.set('droneSerial', drone.serial);
    feature.setStyle(createDroneStyle(
      position.heading ?? 0,
      selectedDroneId === drone.id,
      false,
    ));
    features.push(feature);
  }

  return features;
}

export function buildDronePathFeature(
  drones: Drone[],
  selectedDroneId: string | undefined,
  trailEnd?: { longitude: number; latitude: number },
  pathCutoffRecordedAt?: string,
): Feature<LineString> | null {
  const coordinates = buildDronePathCoordinates(
    drones,
    selectedDroneId,
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
  trailEnd?: { longitude: number; latitude: number },
  pathCutoffRecordedAt?: string,
): number[][] | null {
  if (selectedDroneId == null) return null;

  const drone = drones.find((d) => d.id === selectedDroneId);
  if (!drone) {
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
