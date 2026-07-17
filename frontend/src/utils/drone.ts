import { Drone, Position, Session } from './types';

const MAX_STORED_POSITIONS = 500;

function pickLatestSession(sessions: Session[]): Session | undefined {
  return sessions.reduce<Session | undefined>((latest, session) => {
    if (!latest) return session;
    return new Date(session.startedAt) > new Date(latest.startedAt) ? session : latest;
  }, undefined);
}

/** Active flight session only (endedAt is null). Used for live flight path on the map. */
export function getActiveSession(sessions: Session[]): Session | undefined {
  return pickLatestSession(sessions.filter((session) => !session.endedAt));
}

/** Latest session for telemetry display — active, or most recent ended if none active. */
export function getCurrentSession(sessions: Session[]): Session | undefined {
  const active = getActiveSession(sessions);
  if (active) return active;
  return pickLatestSession(sessions);
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
  const incomingSession = getActiveSession(incoming.sessions);
  const newPosition = incomingSession
    ? getLatestPosition(incomingSession.positions)
    : undefined;
  if (!incomingSession || !newPosition) {
    const stillActive = existing.sessions.some((session) => !session.endedAt);
    if (!stillActive) return prev;

    const sessions = existing.sessions.map((session) =>
      session.endedAt ? session : { ...session, endedAt: new Date().toISOString() },
    );
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
    const endedAt = new Date().toISOString();
    const closedSessions = existing.sessions.map((session) =>
      !session.endedAt ? { ...session, endedAt } : session,
    );
    sessions = [...closedSessions, incomingSession];
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
