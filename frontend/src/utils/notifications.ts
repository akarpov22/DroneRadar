import { useTranslation } from 'react-i18next';
import type { AlertKind, DroneNotification } from '../../utils/types';

export function formatNotificationMessage(
  notification: DroneNotification,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  const params = {
    drone: notification.droneName,
    other: notification.relatedDroneName ?? t('alert-unknown-target'),
    zone: notification.zoneName ?? t('alert-unknown-target'),
  };

  switch (notification.kind) {
    case 'DRONE_PROXIMITY':
      return t('alert-drone-proximity', params);
    case 'ZONE_APPROACH':
      return t('alert-zone-approach', params);
    case 'ZONE_ENTER':
      return t('alert-zone-enter', params);
    case 'COLLISION_ALTITUDE':
      return t('alert-collision-altitude', params);
    case 'USER_ZONE_ENTER':
      return t('alert-user-zone-enter', params);
    case 'USER_ZONE_EXIT':
      return t('alert-user-zone-exit', params);
    case 'CLEARED':
      return t('alert-cleared', params);
    default:
      return notification.message;
  }
}

export function severityColor(severity: DroneNotification['severity']): string {
  switch (severity) {
    case 'RED':
      return 'red.400';
    case 'YELLOW':
      return 'yellow.400';
    case 'GREEN':
      return 'green.400';
    default:
      return 'gray.400';
  }
}

export function alertStatusColor(status: string): string {
  switch (status) {
    case 'RED':
      return 'red.400';
    case 'YELLOW':
      return 'yellow.400';
    case 'GREEN':
      return 'green.400';
    default:
      return 'green.400';
  }
}

export function notificationToastStatus(
  severity: DroneNotification['severity'],
): 'warning' | 'error' | 'success' | 'info' {
  switch (severity) {
    case 'RED':
      return 'error';
    case 'YELLOW':
      return 'warning';
    case 'GREEN':
      return 'success';
    default:
      return 'info';
  }
}

export function isAlertKind(value: string): value is AlertKind {
  return [
    'DRONE_PROXIMITY',
    'ZONE_APPROACH',
    'ZONE_ENTER',
    'COLLISION_ALTITUDE',
    'USER_ZONE_ENTER',
    'USER_ZONE_EXIT',
    'CLEARED',
  ].includes(value);
}
