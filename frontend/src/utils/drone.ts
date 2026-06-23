import { Drone, Position, Session } from './types';

export function getCurrentSession(sessions: Session[]): Session | undefined {
  const active = sessions.filter((session) => !session.endedAt);
  const pool = active.length > 0 ? active : sessions;

  return pool.reduce<Session | undefined>((latest, session) => {
    if (!latest) return session;
    return new Date(session.startedAt) > new Date(latest.startedAt) ? session : latest;
  }, undefined);
}

export function getLatestPosition(positions: Position[]): Position | undefined {
  return positions.reduce<Position | undefined>((latest, position) => {
    if (!latest) return position;
    return new Date(position.recordedAt) > new Date(latest.recordedAt) ? position : latest;
  }, undefined);
}

export function getDroneLatestPosition(drone: Drone): Position | undefined {
  return getLatestPosition(getCurrentSession(drone.sessions)?.positions ?? []);
}

export function getLatestRecordedAt(drone: Drone): number {
  let latest = 0;

  for (const session of drone.sessions) {
    for (const position of session.positions) {
      const recordedAt = new Date(position.recordedAt).getTime();
      if (recordedAt > latest) {
        latest = recordedAt;
      }
    }
  }

  return latest;
}

export function mergeDroneUpdate(prev: Drone[], incoming: Drone): Drone[] {
  const existing = prev.find((drone) => drone.id === incoming.id);

  if (!existing) {
    return prev.concat(incoming);
  }

  if (getLatestRecordedAt(incoming) < getLatestRecordedAt(existing)) {
    return prev;
  }

  return prev.filter((drone) => drone.id !== incoming.id).concat(incoming);
}
