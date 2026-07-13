export const TELEMETRY_TOPIC_PREFIX = 'droneradar/telemetry/';

export type TelemetryPayloadInput = {
  regionCode?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  altitude?: unknown;
  heading?: unknown;
  speed?: unknown;
  timestamp?: unknown;
};

export type ValidatedTelemetry = {
  latitude: number;
  longitude: number;
  timestamp: string;
  regionCode: string;
  altitude?: number;
  heading?: number;
  speed?: number;
};

export type TelemetryValidationResult =
  | { valid: true; payload: ValidatedTelemetry }
  | { valid: false; reason: string };

const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

function parseOptionalNumber(value: unknown, field: string): number | undefined | 'invalid' {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'invalid';
  }
  return value;
}

export function parseSerialFromTopic(topic: string): string | null {
  if (!topic.startsWith(TELEMETRY_TOPIC_PREFIX)) {
    return null;
  }

  const serial = topic.slice(TELEMETRY_TOPIC_PREFIX.length).trim();
  return serial.length > 0 ? serial : null;
}

export function validateTelemetryPayload(input: unknown): TelemetryValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, reason: 'payload must be an object' };
  }

  const payload = input as TelemetryPayloadInput;

  if (typeof payload.latitude !== 'number' || !Number.isFinite(payload.latitude)) {
    return { valid: false, reason: 'latitude is required and must be a finite number' };
  }

  if (typeof payload.longitude !== 'number' || !Number.isFinite(payload.longitude)) {
    return { valid: false, reason: 'longitude is required and must be a finite number' };
  }

  if (typeof payload.timestamp !== 'string' || payload.timestamp.trim().length === 0) {
    return { valid: false, reason: 'timestamp is required and must be a non-empty string' };
  }

  if (typeof payload.regionCode !== 'string' || payload.regionCode.trim().length === 0) {
    return { valid: false, reason: 'regionCode is required and must be a non-empty string' };
  }

  if (payload.latitude < MIN_LATITUDE || payload.latitude > MAX_LATITUDE) {
    return { valid: false, reason: 'latitude is out of allowed range' };
  }

  if (payload.longitude < MIN_LONGITUDE || payload.longitude > MAX_LONGITUDE) {
    return { valid: false, reason: 'longitude is out of allowed range' };
  }

  const altitude = parseOptionalNumber(payload.altitude, 'altitude');
  if (altitude === 'invalid') {
    return { valid: false, reason: 'altitude must be a finite number when provided' };
  }

  const heading = parseOptionalNumber(payload.heading, 'heading');
  if (heading === 'invalid') {
    return { valid: false, reason: 'heading must be a finite number when provided' };
  }

  const speed = parseOptionalNumber(payload.speed, 'speed');
  if (speed === 'invalid') {
    return { valid: false, reason: 'speed must be a finite number when provided' };
  }

  const validated: ValidatedTelemetry = {
    latitude: payload.latitude,
    longitude: payload.longitude,
    timestamp: payload.timestamp,
    regionCode: payload.regionCode.trim(),
  };

  if (altitude !== undefined) validated.altitude = altitude;
  if (heading !== undefined) validated.heading = heading;
  if (speed !== undefined) validated.speed = speed;

  return { valid: true, payload: validated };
}
