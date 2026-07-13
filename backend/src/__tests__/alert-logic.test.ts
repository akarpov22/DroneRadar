import { describe, expect, it } from 'vitest';
import { DRONE_PROXIMITY_METERS } from '../config/alert-thresholds';
import {
  AlertKind,
  AlertSeverity,
  AlertStatus,
} from '../generated/schema';
import {
  aggregateStatus,
  DronePositionSnapshot,
  evaluateDroneWarnings,
  getWarningsToPublish,
  shouldEmitCleared,
} from '../services/alert-logic';
import { horizontalDistanceMeters } from '../services/geo-utils';

function makeDrone(
  id: string,
  latitude: number,
  longitude: number,
): DronePositionSnapshot {
  return {
    droneId: id,
    droneName: `Drone ${id}`,
    pilotId: 'pilot-1',
    latitude,
    longitude,
    altitude: null,
  };
}

describe('evaluateDroneWarnings', () => {
  it('creates a proximity warning when another drone is within the threshold', () => {
    // Arrange
    const target = makeDrone('drone-a', 59.3293, 18.0686);
    const closeLon = 18.0686 + 0.00035;
    const other = makeDrone('drone-b', 59.3293, closeLon);
    const distance = horizontalDistanceMeters(
      target.latitude,
      target.longitude,
      other.latitude,
      other.longitude,
    );
    expect(distance).toBeLessThanOrEqual(DRONE_PROXIMITY_METERS);

    // Act
    const warnings = evaluateDroneWarnings(target, [target, other], []);

    // Assert
    expect(warnings).toEqual([
      expect.objectContaining({
        kind: AlertKind.DroneProximity,
        severity: AlertSeverity.Yellow,
        relatedDroneId: 'drone-b',
      }),
    ]);
  });

  it('does not create a proximity warning when distance exceeds the threshold', () => {
    // Arrange
    const target = makeDrone('drone-a', 59.3293, 18.0686);
    const farLon = 18.0686 + 0.0012;
    const other = makeDrone('drone-b', 59.3293, farLon);
    const distance = horizontalDistanceMeters(
      target.latitude,
      target.longitude,
      other.latitude,
      other.longitude,
    );
    expect(distance).toBeGreaterThan(DRONE_PROXIMITY_METERS);

    // Act
    const warnings = evaluateDroneWarnings(target, [target, other], []);

    // Assert
    expect(warnings).toEqual([]);
  });
});

describe('aggregateStatus', () => {
  it('prioritizes RED over YELLOW and GREEN', () => {
    // Arrange
    const warnings = [
      {
        key: 'YELLOW:1',
        kind: AlertKind.DroneProximity,
        severity: AlertSeverity.Yellow,
      },
      {
        key: 'RED:1',
        kind: AlertKind.ZoneEnter,
        severity: AlertSeverity.Red,
      },
    ];

    // Act
    const status = aggregateStatus(warnings);

    // Assert
    expect(status).toBe(AlertStatus.Red);
  });
});

describe('warning transitions', () => {
  it('publishes only newly appeared warnings', () => {
    // Arrange
    const previousKeys = new Set(['DRONE_PROXIMITY:drone-b']);
    const nextWarnings = [
      {
        key: 'DRONE_PROXIMITY:drone-b',
        kind: AlertKind.DroneProximity,
        severity: AlertSeverity.Yellow,
      },
      {
        key: 'DRONE_PROXIMITY:drone-c',
        kind: AlertKind.DroneProximity,
        severity: AlertSeverity.Yellow,
      },
    ];

    // Act
    const toPublish = getWarningsToPublish(previousKeys, nextWarnings);

    // Assert
    expect(toPublish).toHaveLength(1);
    expect(toPublish[0].key).toBe('DRONE_PROXIMITY:drone-c');
  });

  it('emits CLEARED when active threats disappear', () => {
    // Arrange
    const previousStatus = AlertStatus.Yellow;
    const nextStatus = AlertStatus.Green;

    // Act
    const shouldClear = shouldEmitCleared(previousStatus, nextStatus);

    // Assert
    expect(shouldClear).toBe(true);
  });
});
