import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import {
  canUserSeeDroneNotification,
  DroneNotificationPayload,
  filterNotificationsForUser,
} from '../services/drone-alert-service';
import { AlertKind, AlertSeverity } from '../generated/schema';

function makeNotification(
  overrides: Partial<DroneNotificationPayload> = {},
): DroneNotificationPayload {
  return {
    id: 'notification-1',
    droneId: 'drone-1',
    droneName: 'Alpha',
    pilotId: 'pilot-a',
    kind: AlertKind.DroneProximity,
    severity: AlertSeverity.Yellow,
    message: 'Alpha is approaching drone Beta',
    relatedDroneId: 'drone-2',
    relatedDroneName: 'Beta',
    zoneId: null,
    zoneName: null,
    createdAt: new Date('2026-07-13T12:00:00.000Z'),
    ...overrides,
  };
}

describe('notification access control', () => {
  const notifications = [
    makeNotification({ id: 'n-1', pilotId: 'pilot-a', droneId: 'drone-a' }),
    makeNotification({ id: 'n-2', pilotId: 'pilot-b', droneId: 'drone-b' }),
    makeNotification({ id: 'n-3', pilotId: null, droneId: 'drone-c' }),
  ];

  it('returns only own drone notifications for PILOT', () => {
    // Arrange
    const userId = 'pilot-a';

    // Act
    const visible = filterNotificationsForUser(notifications, userId, UserRole.PILOT);

    // Assert
    expect(visible.map((item) => item.id)).toEqual(['n-1']);
  });

  it('returns all pilot-associated notifications for ADMIN', () => {
    // Arrange
    const userId = 'admin-1';

    // Act
    const visible = filterNotificationsForUser(notifications, userId, UserRole.ADMIN);

    // Assert
    expect(visible.map((item) => item.id)).toEqual(['n-1', 'n-2']);
  });

  it('denies personalized notifications for OBSERVER', () => {
    // Arrange
    const notification = makeNotification({ pilotId: 'pilot-a' });

    // Act
    const canSee = canUserSeeDroneNotification(
      notification,
      'observer-1',
      UserRole.OBSERVER,
    );

    // Assert
    expect(canSee).toBe(false);
  });
});
