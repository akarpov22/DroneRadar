import { Drone, Position, Session } from './types';

const MAX_STORED_POSITIONS = 500;

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

export function isDroneRegistered(drone: Drone): boolean {
  return drone.model != null;
}

export function mergeDroneUpdate(prev: Drone[], incoming: Drone): Drone[] {
  const index = prev.findIndex((drone) => drone.id === incoming.id);
  if (index === -1) {
    return [...prev, incoming];
  }

  const existing = prev[index];
  const incomingSession = getCurrentSession(incoming.sessions);
  const newPosition = incomingSession
    ? getLatestPosition(incomingSession.positions)
    : undefined;
  if (!incomingSession || !newPosition) {
    return prev;
  }

  const existingLatest = getDroneLatestPosition(existing);
  if (
    existingLatest &&
    new Date(newPosition.recordedAt) <= new Date(existingLatest.recordedAt)
  ) {
    return prev;
  }

  const sessionIndex = existing.sessions.findIndex((session) => session.id === incomingSession.id);
  let sessions: Session[];

  if (sessionIndex === -1) {
    sessions = [...existing.sessions, incomingSession];
  } else {
    const session = existing.sessions[sessionIndex];
    if (session.positions.some((position) => position.id === newPosition.id)) {
      return prev;
    }

    let positions = [...session.positions, newPosition];
    if (positions.length > MAX_STORED_POSITIONS) {
      positions = positions.slice(-MAX_STORED_POSITIONS);
    }

    sessions = [...existing.sessions];
    sessions[sessionIndex] = { ...session, positions };
  }

  const next = [...prev];
  next[index] = {
    ...existing,
    name: incoming.name,
    serial: incoming.serial,
    model: incoming.model ?? existing.model,
    alertStatus: incoming.alertStatus ?? existing.alertStatus,
    sessions,
  };
  return next;
}
