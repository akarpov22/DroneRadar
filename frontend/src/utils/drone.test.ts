import { describe, expect, it } from 'vitest';
import { lerpValue } from '../components/ol-map/drone-animation';
import { mergeDroneUpdate } from '../utils/drone';
import type { Drone, Position, Session } from '../utils/types';

function makePosition(id: string, recordedAt: string, latitude = 59.3293): Position {
  return {
    id,
    altitude: 100,
    latitude,
    longitude: 18.0686,
    speed: 20,
    heading: 90,
    recordedAt,
  };
}

function makeSession(id: string, positions: Position[]): Session {
  return {
    id,
    startedAt: '2026-07-13T10:00:00.000Z',
    endedAt: null,
    positions,
  };
}

function makeDrone(id: string, session: Session): Drone {
  return {
    id,
    name: `Drone ${id}`,
    serial: `SN-${id}`,
    model: null,
    operator: 'Pilot',
    createdAt: '2026-07-13T09:00:00.000Z',
    sessions: [session],
  };
}

describe('mergeDroneUpdate', () => {
  it('appends a new position without duplicating existing position ids', () => {
    // Arrange
    const sessionId = 'session-1';
    const existing = makeDrone('drone-1', makeSession(sessionId, [
      makePosition('pos-1', '2026-07-13T12:00:00.000Z'),
    ]));
    const incoming = makeDrone('drone-1', makeSession(sessionId, [
      makePosition('pos-1', '2026-07-13T12:00:00.000Z'),
      makePosition('pos-2', '2026-07-13T12:00:05.000Z', 59.3294),
    ]));

    // Act
    const firstMerge = mergeDroneUpdate([existing], incoming);
    const secondMerge = mergeDroneUpdate(firstMerge, incoming);

    // Assert
    expect(firstMerge[0].sessions[0].positions.map((position) => position.id)).toEqual([
      'pos-1',
      'pos-2',
    ]);
    expect(secondMerge).toBe(firstMerge);
  });
});

describe('lerpValue', () => {
  it('interpolates coordinates halfway between two telemetry points', () => {
    // Arrange
    const from = 18.0;
    const to = 20.0;
    const t = 0.5;

    // Act
    const midpoint = lerpValue(from, to, t);

    // Assert
    expect(midpoint).toBe(19);
  });
});
