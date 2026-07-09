import { randomUUID } from 'crypto';
import { PrismaClient, UserRole } from '@prisma/client';
import {
  COLLISION_HORIZONTAL_METERS,
  DRONE_PROXIMITY_METERS,
  ZONE_APPROACH_METERS,
} from '../config/alert-thresholds';
import { pubsub } from '../context';
import {
  AlertKind,
  AlertSeverity,
  AlertStatus,
} from '../generated/schema';
import { getFlightZonesByBbox } from './flight-zones-db';
import {
  distanceToZoneBoundaryMeters,
  horizontalDistanceMeters,
  isPointInZone,
} from './geo-utils';

export type DroneNotificationPayload = {
  id: string;
  droneId: string;
  droneName: string;
  pilotId: string | null;
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
  relatedDroneId: string | null;
  relatedDroneName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  createdAt: Date;
};

type ActiveWarning = {
  key: string;
  kind: AlertKind;
  severity: AlertSeverity;
  relatedDroneId?: string;
  relatedDroneName?: string;
  zoneId?: string;
  zoneName?: string;
};

type DronePositionSnapshot = {
  droneId: string;
  droneName: string;
  pilotId: string | null;
  latitude: number;
  longitude: number;
  altitude: number | null;
};

const ZONE_BBOX_BUFFER_DEG = 0.01;
const NOTIFICATION_HISTORY_LIMIT = 100;

const alertStatusByDroneId = new Map<string, AlertStatus>();
const activeWarningsByDroneId = new Map<string, Set<string>>();
const notificationHistory: DroneNotificationPayload[] = [];

function warningKey(kind: AlertKind, entityId: string): string {
  return `${kind}:${entityId}`;
}

export function getAlertStatus(droneId: string): AlertStatus {
  return alertStatusByDroneId.get(droneId) ?? AlertStatus.Green;
}

export function getNotificationHistory(): DroneNotificationPayload[] {
  return [...notificationHistory];
}

function aggregateStatus(warnings: ActiveWarning[]): AlertStatus {
  if (warnings.some((w) => w.severity === AlertSeverity.Red)) return AlertStatus.Red;
  if (warnings.some((w) => w.severity === AlertSeverity.Yellow)) return AlertStatus.Yellow;
  return AlertStatus.Green;
}

function buildMessage(warning: ActiveWarning, droneName: string): string {
  switch (warning.kind) {
    case AlertKind.DroneProximity:
      return `${droneName} is approaching drone ${warning.relatedDroneName ?? 'unknown'}`;
    case AlertKind.ZoneApproach:
      return `${droneName} is approaching zone ${warning.zoneName ?? 'unknown'}`;
    case AlertKind.ZoneEnter:
      return `${droneName} entered zone ${warning.zoneName ?? 'unknown'}`;
    case AlertKind.CollisionAltitude:
      return `${droneName} shares coordinates with ${warning.relatedDroneName ?? 'unknown'} (different altitude)`;
    case AlertKind.Cleared:
      return `${droneName}: all warnings cleared`;
    default:
      return `${droneName}: alert`;
  }
}

function pushNotification(notification: DroneNotificationPayload): void {
  notificationHistory.unshift(notification);
  if (notificationHistory.length > NOTIFICATION_HISTORY_LIMIT) {
    notificationHistory.length = NOTIFICATION_HISTORY_LIMIT;
  }
}

async function publishNotification(
  drone: { id: string; name: string; pilotId: string | null },
  warning: ActiveWarning,
): Promise<void> {
  const notification: DroneNotificationPayload = {
    id: randomUUID(),
    droneId: drone.id,
    droneName: drone.name,
    pilotId: drone.pilotId,
    kind: warning.kind,
    severity: warning.severity,
    message: buildMessage(warning, drone.name),
    relatedDroneId: warning.relatedDroneId ?? null,
    relatedDroneName: warning.relatedDroneName ?? null,
    zoneId: warning.zoneId ?? null,
    zoneName: warning.zoneName ?? null,
    createdAt: new Date(),
  };

  pushNotification(notification);

  await pubsub.publish('DRONE_ALERT', {
    droneNotification: notification,
  });
}

async function loadDronePositions(prisma: PrismaClient): Promise<DronePositionSnapshot[]> {
  const activeSessions = await prisma.droneSession.findMany({
    where: { endedAt: null },
  });

  const snapshots: DronePositionSnapshot[] = [];

  for (const session of activeSessions) {
    const position = await prisma.position.findFirst({
      where: { sessionId: session.id },
      orderBy: { recordedAt: 'desc' },
    });
    if (!position) continue;

    const drone = await prisma.drone.findUnique({ where: { id: session.droneId } });
    if (!drone) continue;

    snapshots.push({
      droneId: drone.id,
      droneName: drone.name,
      pilotId: drone.pilotId,
      latitude: position.latitude,
      longitude: position.longitude,
      altitude: position.altitude,
    });
  }

  return snapshots;
}

function evaluateDroneWarnings(
  target: DronePositionSnapshot,
  allPositions: DronePositionSnapshot[],
  zones: Awaited<ReturnType<typeof getFlightZonesByBbox>>,
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

async function applyWarningTransitions(
  drone: { id: string; name: string; pilotId: string | null },
  nextWarnings: ActiveWarning[],
): Promise<void> {
  const previousKeys = activeWarningsByDroneId.get(drone.id) ?? new Set<string>();
  const nextKeys = new Set(nextWarnings.map((w) => w.key));
  const previousStatus = getAlertStatus(drone.id);
  const nextStatus = aggregateStatus(nextWarnings);

  for (const warning of nextWarnings) {
    if (!previousKeys.has(warning.key)) {
      await publishNotification(drone, warning);
    }
  }

  activeWarningsByDroneId.set(drone.id, nextKeys);
  alertStatusByDroneId.set(drone.id, nextStatus);

  if (previousStatus !== AlertStatus.Green && nextStatus === AlertStatus.Green) {
    await publishNotification(drone, {
      key: 'CLEARED',
      kind: AlertKind.Cleared,
      severity: AlertSeverity.Green,
    });
  }
}

export async function evaluateDroneAlerts(
  prisma: PrismaClient,
  droneId: string,
): Promise<void> {
  const drone = await prisma.drone.findUnique({ where: { id: droneId } });
  if (!drone?.pilotId) return;

  const allPositions = await loadDronePositions(prisma);
  const target = allPositions.find((p) => p.droneId === droneId);
  if (!target) return;

  const zones = await getFlightZonesByBbox([
    target.longitude - ZONE_BBOX_BUFFER_DEG,
    target.latitude - ZONE_BBOX_BUFFER_DEG,
    target.longitude + ZONE_BBOX_BUFFER_DEG,
    target.latitude + ZONE_BBOX_BUFFER_DEG,
  ]);

  const warnings = evaluateDroneWarnings(target, allPositions, zones);
  await applyWarningTransitions(
    { id: drone.id, name: drone.name, pilotId: drone.pilotId },
    warnings,
  );
}

export function filterNotificationsForUser(
  notifications: DroneNotificationPayload[],
  userId: string,
  role: typeof UserRole.ADMIN | typeof UserRole.PILOT,
): DroneNotificationPayload[] {
  if (role === UserRole.ADMIN) {
    return notifications.filter((n) => n.pilotId != null);
  }
  return notifications.filter((n) => n.pilotId === userId);
}

export function canUserSeeDroneNotification(
  notification: DroneNotificationPayload,
  userId: string,
  role: UserRole,
): boolean {
  if (role === UserRole.OBSERVER || !notification.pilotId) return false;
  if (role === UserRole.ADMIN) return true;
  return notification.pilotId === userId;
}
