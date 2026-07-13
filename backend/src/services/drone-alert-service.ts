import { randomUUID } from 'crypto';
import { PrismaClient, UserRole } from '@prisma/client';
import { pubsub } from '../context';
import {
  AlertKind,
  AlertSeverity,
  AlertStatus,
} from '../generated/schema';
import {
  ActiveWarning,
  aggregateStatus,
  DronePositionSnapshot,
  evaluateDroneWarnings,
  getWarningsToPublish,
  shouldEmitCleared,
} from './alert-logic';
import { getFlightZonesByBbox } from './flight-zones-db';
import { listUserZones } from './user-zones';
import { isPointInZone } from './geo-utils';

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

const ZONE_BBOX_BUFFER_DEG = 0.01;
const NOTIFICATION_HISTORY_LIMIT = 100;

const alertStatusByDroneId = new Map<string, AlertStatus>();
const activeWarningsByDroneId = new Map<string, Set<string>>();
const userZoneInsideByDroneId = new Map<string, Set<string>>();
const notificationHistory: DroneNotificationPayload[] = [];

export function getAlertStatus(droneId: string): AlertStatus {
  return alertStatusByDroneId.get(droneId) ?? AlertStatus.Green;
}

export function getNotificationHistory(): DroneNotificationPayload[] {
  return [...notificationHistory];
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
      return `${droneName}: high collision risk with ${warning.relatedDroneName ?? 'unknown'}`;
    case AlertKind.UserZoneEnter:
      return `${droneName} entered user zone ${warning.zoneName ?? 'unknown'}`;
    case AlertKind.UserZoneExit:
      return `${droneName} exited user zone ${warning.zoneName ?? 'unknown'}`;
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

function resolveUserZoneName(name: string | null, zoneId: string): string {
  return name?.trim() || zoneId;
}

async function evaluateUserZoneTransitions(
  drone: { id: string; name: string; pilotId: string | null },
  target: DronePositionSnapshot,
  userZones: Awaited<ReturnType<typeof listUserZones>>,
): Promise<void> {
  const previousInside = userZoneInsideByDroneId.get(drone.id) ?? new Set<string>();
  const currentInside = new Set<string>();

  for (const zone of userZones) {
    if (isPointInZone(target.latitude, target.longitude, zone.geometry)) {
      currentInside.add(zone.id);
    }
  }

  for (const zoneId of currentInside) {
    if (previousInside.has(zoneId)) continue;

    const zone = userZones.find((item) => item.id === zoneId);
    await publishNotification(drone, {
      key: `${AlertKind.UserZoneEnter}:${zoneId}:${Date.now()}`,
      kind: AlertKind.UserZoneEnter,
      severity: AlertSeverity.Yellow,
      zoneId,
      zoneName: resolveUserZoneName(zone?.name ?? null, zoneId),
    });
  }

  for (const zoneId of previousInside) {
    if (currentInside.has(zoneId)) continue;

    const zone = userZones.find((item) => item.id === zoneId);
    await publishNotification(drone, {
      key: `${AlertKind.UserZoneExit}:${zoneId}:${Date.now()}`,
      kind: AlertKind.UserZoneExit,
      severity: AlertSeverity.Yellow,
      zoneId,
      zoneName: resolveUserZoneName(zone?.name ?? null, zoneId),
    });
  }

  userZoneInsideByDroneId.set(drone.id, currentInside);
}

async function applyWarningTransitions(
  drone: { id: string; name: string; pilotId: string | null },
  nextWarnings: ActiveWarning[],
): Promise<void> {
  const previousKeys = activeWarningsByDroneId.get(drone.id) ?? new Set<string>();
  const nextKeys = new Set(nextWarnings.map((w) => w.key));
  const previousStatus = getAlertStatus(drone.id);
  const nextStatus = aggregateStatus(nextWarnings);

  for (const warning of getWarningsToPublish(previousKeys, nextWarnings)) {
    await publishNotification(drone, warning);
  }

  activeWarningsByDroneId.set(drone.id, nextKeys);
  alertStatusByDroneId.set(drone.id, nextStatus);

  if (shouldEmitCleared(previousStatus, nextStatus)) {
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

  const userZones = await listUserZones(drone.pilotId);
  await evaluateUserZoneTransitions(
    { id: drone.id, name: drone.name, pilotId: drone.pilotId },
    target,
    userZones,
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
