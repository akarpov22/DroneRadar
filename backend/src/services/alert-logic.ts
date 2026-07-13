import {
  COLLISION_HORIZONTAL_METERS,
  DRONE_PROXIMITY_METERS,
  ZONE_APPROACH_METERS,
} from '../config/alert-thresholds';
import {
  AlertKind,
  AlertSeverity,
  AlertStatus,
} from '../generated/schema';
import {
  distanceToZoneBoundaryMeters,
  horizontalDistanceMeters,
  isPointInZone,
} from './geo-utils';

export type ActiveWarning = {
  key: string;
  kind: AlertKind;
  severity: AlertSeverity;
  relatedDroneId?: string;
  relatedDroneName?: string;
  zoneId?: string;
  zoneName?: string;
};

export type DronePositionSnapshot = {
  droneId: string;
  droneName: string;
  pilotId: string | null;
  latitude: number;
  longitude: number;
  altitude: number | null;
};

export type FlightZoneSnapshot = {
  id: string;
  name: string | null;
  layerType: string;
  geometry: unknown;
};

export function warningKey(kind: AlertKind, entityId: string): string {
  return `${kind}:${entityId}`;
}

export function aggregateStatus(warnings: ActiveWarning[]): AlertStatus {
  if (warnings.some((w) => w.severity === AlertSeverity.Red)) return AlertStatus.Red;
  if (warnings.some((w) => w.severity === AlertSeverity.Yellow)) return AlertStatus.Yellow;
  return AlertStatus.Green;
}

export function getWarningsToPublish(
  previousKeys: Set<string>,
  nextWarnings: ActiveWarning[],
): ActiveWarning[] {
  return nextWarnings.filter((warning) => !previousKeys.has(warning.key));
}

export function shouldEmitCleared(
  previousStatus: AlertStatus,
  nextStatus: AlertStatus,
): boolean {
  return previousStatus !== AlertStatus.Green && nextStatus === AlertStatus.Green;
}

export function evaluateDroneWarnings(
  target: DronePositionSnapshot,
  allPositions: DronePositionSnapshot[],
  zones: FlightZoneSnapshot[],
): ActiveWarning[] {
  const warnings: ActiveWarning[] = [];

  for (const other of allPositions) {
    if (other.droneId === target.droneId) continue;

    const dist = horizontalDistanceMeters(
      target.latitude,
      target.longitude,
      other.latitude,
      other.longitude,
    );

    const bothHaveAltitude =
      target.altitude != null && other.altitude != null;
    const altitudesDiffer =
      bothHaveAltitude && target.altitude !== other.altitude;

    if (dist <= COLLISION_HORIZONTAL_METERS && altitudesDiffer) {
      warnings.push({
        key: warningKey(AlertKind.CollisionAltitude, other.droneId),
        kind: AlertKind.CollisionAltitude,
        severity: AlertSeverity.Red,
        relatedDroneId: other.droneId,
        relatedDroneName: other.droneName,
      });
      continue;
    }

    if (dist <= DRONE_PROXIMITY_METERS) {
      warnings.push({
        key: warningKey(AlertKind.DroneProximity, other.droneId),
        kind: AlertKind.DroneProximity,
        severity: AlertSeverity.Yellow,
        relatedDroneId: other.droneId,
        relatedDroneName: other.droneName,
      });
    }
  }

  for (const zone of zones) {
    if (zone.layerType === 'NOTAM') continue;

    const inside = isPointInZone(target.latitude, target.longitude, zone.geometry);

    if (inside) {
      warnings.push({
        key: warningKey(AlertKind.ZoneEnter, zone.id),
        kind: AlertKind.ZoneEnter,
        severity: AlertSeverity.Red,
        zoneId: zone.id,
        zoneName: zone.name ?? zone.id,
      });
      continue;
    }

    const boundaryDistance = distanceToZoneBoundaryMeters(
      target.latitude,
      target.longitude,
      zone.geometry,
    );

    if (boundaryDistance <= ZONE_APPROACH_METERS) {
      warnings.push({
        key: warningKey(AlertKind.ZoneApproach, zone.id),
        kind: AlertKind.ZoneApproach,
        severity: AlertSeverity.Yellow,
        zoneId: zone.id,
        zoneName: zone.name ?? zone.id,
      });
    }
  }

  return warnings;
}
