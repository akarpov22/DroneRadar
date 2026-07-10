import { Feature } from 'ol';
import { Point } from 'ol/geom';
import type { Position } from '../../utils/types';
import { isDroneSignalLost } from '../../utils/drone-signal';

const MIN_DURATION_MS = 200;
const MAX_DURATION_MS = 3000;
const MAX_EXTRAPOLATION_MS = 1500;
const MAX_PLAUSIBLE_SPEED_KMH = 150;
const SPEED_TOLERANCE = 1.5;

export interface DroneAnimState {
  droneId: string;
  feature: Feature<Point>;
  fromLon: number;
  fromLat: number;
  toLon: number;
  toLat: number;
  toHeading: number;
  toSpeed: number;
  startMs: number;
  durationMs: number;
  recordedAt: string;
  /** Last confirmed telemetry time — path only includes points up to this moment. */
  pathCutoffRecordedAt: string;
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

export function distanceMeters(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLon = toRadians(toLon - fromLon);

  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Move from a WGS84 point along heading at speed for elapsed time. */
export function projectPosition(
  latitude: number,
  longitude: number,
  headingDeg: number,
  speedKmh: number,
  elapsedMs: number,
): { latitude: number; longitude: number } {
  const distanceM = (speedKmh / 3.6) * (elapsedMs / 1000);
  if (distanceM <= 0) return { latitude, longitude };

  const angularDist = distanceM / 6371000;
  const bearing = toRadians(headingDeg);
  const lat1 = toRadians(latitude);
  const lon1 = toRadians(longitude);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist)
    + Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing),
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
    Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2),
  );

  return {
    latitude: toDegrees(lat2),
    longitude: ((toDegrees(lon2) + 540) % 360) - 180,
  };
}

export function lerpValue(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Bearing from one WGS84 point to another (0 = north, 90 = east). */
export function movementHeading(
  fromLon: number,
  fromLat: number,
  toLon: number,
  toLat: number,
): number | null {
  const dLon = toLon - fromLon;
  const dLat = toLat - fromLat;
  if (Math.abs(dLon) < 1e-9 && Math.abs(dLat) < 1e-9) return null;

  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const y = Math.sin(toRadians(dLon)) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(toRadians(dLon));

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function recordedAtDeltaMs(prevRecordedAt: string | undefined, nextRecordedAt: string): number {
  if (!prevRecordedAt) return 0;
  const delta = new Date(nextRecordedAt).getTime() - new Date(prevRecordedAt).getTime();
  if (delta <= 0) return 500;
  return Math.min(Math.max(delta, MIN_DURATION_MS), MAX_DURATION_MS);
}

/** Prefer physics-based duration when speed is known. */
export function computeAnimationDuration(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  prevRecordedAt: string | undefined,
  nextRecordedAt: string,
  speedKmh: number | null,
): number {
  if (!prevRecordedAt) return 0;

  const timeBasedMs = recordedAtDeltaMs(prevRecordedAt, nextRecordedAt);
  const segmentMeters = distanceMeters(fromLat, fromLon, toLat, toLon);

  if (speedKmh != null && speedKmh > 0 && segmentMeters > 0.5) {
    const speedBasedMs = (segmentMeters / (speedKmh / 3.6)) * 1000;
    return Math.min(Math.max(speedBasedMs, MIN_DURATION_MS), MAX_DURATION_MS);
  }

  return timeBasedMs;
}

/** Limit target to what is reachable at reported speed — filters GPS spikes. */
export function sanitizePositionTarget(
  fromLat: number,
  fromLon: number,
  target: Position,
  prevRecordedAt: string,
  fallbackSpeedKmh: number,
  fallbackHeading: number,
): { latitude: number; longitude: number } {
  const deltaMs = recordedAtDeltaMs(prevRecordedAt, target.recordedAt);
  const segmentMeters = distanceMeters(fromLat, fromLon, target.latitude, target.longitude);

  if (segmentMeters < 0.5 || deltaMs <= 0) {
    return { latitude: target.latitude, longitude: target.longitude };
  }

  const impliedSpeedKmh = (segmentMeters / 1000) / (deltaMs / 3_600_000);
  const trustedSpeed = Math.max(target.speed ?? 0, fallbackSpeedKmh, 5);
  const maxSpeedKmh = Math.min(MAX_PLAUSIBLE_SPEED_KMH, trustedSpeed * SPEED_TOLERANCE);

  if (impliedSpeedKmh <= maxSpeedKmh) {
    return { latitude: target.latitude, longitude: target.longitude };
  }

  const maxDistM = (maxSpeedKmh / 3.6) * (deltaMs / 1000);
  const bearing = movementHeading(fromLon, fromLat, target.longitude, target.latitude)
    ?? target.heading
    ?? fallbackHeading;

  return projectPosition(fromLat, fromLon, bearing, maxSpeedKmh, deltaMs);
}

export function getAnimProgress(state: DroneAnimState, nowMs: number): number {
  if (state.durationMs === 0) return 1;
  return Math.min(1, (nowMs - state.startMs) / state.durationMs);
}

export function getExtrapolationMs(state: DroneAnimState, nowMs: number): number {
  if (state.durationMs === 0) return 0;
  const elapsed = nowMs - (state.startMs + state.durationMs);
  if (elapsed <= 0 || state.toSpeed <= 0) return 0;
  return Math.min(elapsed, MAX_EXTRAPOLATION_MS);
}

export function getInterpolatedPosition(state: DroneAnimState, nowMs: number) {
  if (isDroneSignalLost(state.pathCutoffRecordedAt)) {
    return {
      longitude: state.toLon,
      latitude: state.toLat,
      heading: state.toHeading,
    };
  }

  const t = getAnimProgress(state, nowMs);

  if (t < 1) {
    const longitude = lerpValue(state.fromLon, state.toLon, t);
    const latitude = lerpValue(state.fromLat, state.toLat, t);
    const heading = movementHeading(state.fromLon, state.fromLat, state.toLon, state.toLat)
      ?? state.toHeading;

    return { longitude, latitude, heading };
  }

  const extrapolationMs = getExtrapolationMs(state, nowMs);
  if (extrapolationMs > 0) {
    const projected = projectPosition(
      state.toLat,
      state.toLon,
      state.toHeading,
      state.toSpeed,
      extrapolationMs,
    );

    return {
      longitude: projected.longitude,
      latitude: projected.latitude,
      heading: state.toHeading,
    };
  }

  return {
    longitude: state.toLon,
    latitude: state.toLat,
    heading: state.toHeading,
  };
}

export function setAnimTarget(
  state: DroneAnimState,
  position: Position,
  nowMs: number,
): void {
  const current = getInterpolatedPosition(state, nowMs);
  const sanitized = sanitizePositionTarget(
    current.latitude,
    current.longitude,
    position,
    state.recordedAt,
    state.toSpeed,
    state.toHeading,
  );

  const toHeading = position.heading
    ?? movementHeading(current.longitude, current.latitude, sanitized.longitude, sanitized.latitude)
    ?? state.toHeading;
  const toSpeed = Math.max(position.speed ?? 0, state.toSpeed, 0);

  const durationMs = computeAnimationDuration(
    current.latitude,
    current.longitude,
    sanitized.latitude,
    sanitized.longitude,
    state.recordedAt,
    position.recordedAt,
    toSpeed > 0 ? toSpeed : null,
  );

  state.fromLon = current.longitude;
  state.fromLat = current.latitude;
  state.pathCutoffRecordedAt = state.recordedAt;
  state.toLon = sanitized.longitude;
  state.toLat = sanitized.latitude;
  state.toHeading = toHeading;
  state.toSpeed = toSpeed;
  state.startMs = nowMs;
  state.durationMs = durationMs;
  state.recordedAt = position.recordedAt;
}

export function isAnimating(state: DroneAnimState, nowMs: number): boolean {
  if (isDroneSignalLost(state.pathCutoffRecordedAt)) return false;
  return getAnimProgress(state, nowMs) < 1 || getExtrapolationMs(state, nowMs) > 0;
}
