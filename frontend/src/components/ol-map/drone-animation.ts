import { Feature } from 'ol';
import { Point } from 'ol/geom';
import type { Position } from '../../utils/types';
import { isDroneSignalLost } from '../../utils/drone-signal';

const MIN_DURATION_MS = 200;
const MAX_DURATION_MS = 3000;
/** Short coast only — long dead-reckoning overshoots shuttle endpoints and snaps back with a 180° flip. */
const MAX_EXTRAPOLATION_MS = 200;
/** Only treat as a GPS glitch above this — below it, trust telemetry (incl. fast sim legs). */
const MAX_PLAUSIBLE_SPEED_KMH = 2000;
const MAX_SPIKE_METERS = 10_000;

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

/**
 * Animate over the wall-clock gap between telemetry samples so the marker
 * stays on the recorded track (speed-based duration lagged behind fast hops).
 */
export function computeAnimationDuration(
  _fromLat: number,
  _fromLon: number,
  _toLat: number,
  _toLon: number,
  prevRecordedAt: string | undefined,
  nextRecordedAt: string,
  _speedKmh: number | null,
): number {
  if (!prevRecordedAt) return 0;
  return recordedAtDeltaMs(prevRecordedAt, nextRecordedAt);
}

/** Drop only extreme GPS teleports; otherwise trust telemetry coordinates. */
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
  const isSpike = segmentMeters > MAX_SPIKE_METERS
    || impliedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH;

  if (!isSpike) {
    return { latitude: target.latitude, longitude: target.longitude };
  }

  const maxSpeedKmh = Math.max(fallbackSpeedKmh, target.speed ?? 0, 50);
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
  if (isDroneSignalLost(state.recordedAt)) {
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

/** Smallest signed turn from `fromDeg` to `toDeg` in [-180, 180]. */
export function headingDeltaDeg(fromDeg: number, toDeg: number): number {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

/**
 * Position to start the next animation segment from.
 * If dead-reckoning coasted past the last fix and the new sample lies behind us
 * (typical shuttle turnaround), snap back to the last confirmed point so we don't
 * lerp backwards with a sudden 180° heading flip.
 */
export function getAnimStartPosition(
  state: DroneAnimState,
  next: Position,
  nowMs: number,
): { longitude: number; latitude: number; heading: number } {
  const current = getInterpolatedPosition(state, nowMs);
  const coasting = getExtrapolationMs(state, nowMs) > 0;
  if (!coasting) return current;

  const bearingToNext = movementHeading(
    current.longitude,
    current.latitude,
    next.longitude,
    next.latitude,
  );
  if (bearingToNext == null) {
    return {
      longitude: state.toLon,
      latitude: state.toLat,
      heading: state.toHeading,
    };
  }

  // New fix is more than 90° off the coast heading → we overshot a turnaround.
  if (Math.abs(headingDeltaDeg(state.toHeading, bearingToNext)) > 90) {
    return {
      longitude: state.toLon,
      latitude: state.toLat,
      heading: state.toHeading,
    };
  }

  return current;
}

export function setAnimTarget(
  state: DroneAnimState,
  position: Position,
  nowMs: number,
): void {
  const current = getAnimStartPosition(state, position, nowMs);
  const sanitized = sanitizePositionTarget(
    current.latitude,
    current.longitude,
    position,
    state.recordedAt,
    state.toSpeed,
    state.toHeading,
  );

  const movement = movementHeading(
    current.longitude,
    current.latitude,
    sanitized.longitude,
    sanitized.latitude,
  );
  const reportedHeading = position.heading;
  // Prefer geometry of this hop at turnarounds; telemetry heading can flip a sample early/late.
  const toHeading = movement
    ?? reportedHeading
    ?? state.toHeading;
  // Use the latest reported speed (do not keep a high max — that overshoots endpoints).
  const toSpeed = Math.max(position.speed ?? 0, 0);

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
  if (isDroneSignalLost(state.recordedAt)) return false;
  return getAnimProgress(state, nowMs) < 1 || getExtrapolationMs(state, nowMs) > 0;
}
