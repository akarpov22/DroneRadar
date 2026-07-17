import { describe, expect, it } from 'vitest';
import { lerpValue } from '../components/ol-map/drone-animation';
import { buildDronePathCoordinates } from '../components/ol-map/helpers';
import { getActiveSession, mergeDroneUpdate } from '../utils/drone';
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

function makeSession(
  id: string,
  positions: Position[],
  endedAt: string | null = null,
  startedAt = '2026-07-13T10:00:00.000Z',
): Session {
  return {
    id,
    startedAt,
    endedAt,
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

describe('getActiveSession', () => {
  it('returns only the active session when older ended sessions exist', () => {
    const endedSession = makeSession(
      'session-old',
      [makePosition('pos-old', '2026-07-13T11:00:00.000Z', 59.32)],
      '2026-07-13T11:30:00.000Z',
      '2026-07-13T10:00:00.000Z',
    );
    const activeSession = makeSession(
      'session-active',
      [makePosition('pos-new', '2026-07-13T12:00:00.000Z', 59.33)],
      null,
      '2026-07-13T12:00:00.000Z',
    );

    expect(getActiveSession([endedSession, activeSession])?.id).toBe('session-active');
  });

  it('returns undefined when all sessions are ended', () => {
    const endedSession = makeSession(
      'session-old',
      [makePosition('pos-old', '2026-07-13T11:00:00.000Z')],
      '2026-07-13T11:30:00.000Z',
    );

    expect(getActiveSession([endedSession])).toBeUndefined();
  });
});

describe('buildDronePathCoordinates', () => {
  it('draws path only for the active session', () => {
    const drone = makeDrone('drone-1', makeSession('session-active', [
      makePosition('pos-active', '2026-07-13T12:00:00.000Z', 59.33),
    ]));
    drone.sessions = [
      makeSession(
        'session-old',
        [makePosition('pos-old', '2026-07-13T11:00:00.000Z', 59.32)],
        '2026-07-13T11:30:00.000Z',
      ),
      drone.sessions[0],
    ];

    const coordinates = buildDronePathCoordinates([drone], 'drone-1');

    expect(coordinates).toHaveLength(1);
  });

  it('returns null when there is no active session', () => {
    const drone = makeDrone('drone-1', makeSession(
      'session-old',
      [makePosition('pos-old', '2026-07-13T11:00:00.000Z')],
      '2026-07-13T11:30:00.000Z',
    ));

    expect(buildDronePathCoordinates([drone], 'drone-1')).toBeNull();
  });
});

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
