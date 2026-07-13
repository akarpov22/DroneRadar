import { describe, expect, it } from 'vitest';
import { validateTelemetryPayload } from '../services/telemetry-validation';

describe('validateTelemetryPayload', () => {
  it('accepts a valid payload with required fields', () => {
    // Arrange
    const input = {
      latitude: 59.3293,
      longitude: 18.0686,
      timestamp: '2026-07-13T12:00:00.000Z',
      regionCode: 'SE-ESS',
    };

    // Act
    const result = validateTelemetryPayload(input);

    // Assert
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload).toEqual({
        latitude: 59.3293,
        longitude: 18.0686,
        timestamp: '2026-07-13T12:00:00.000Z',
        regionCode: 'SE-ESS',
      });
    }
  });

  it('rejects a payload missing a required field', () => {
    // Arrange
    const input = {
      longitude: 18.0686,
      timestamp: '2026-07-13T12:00:00.000Z',
      regionCode: 'SE-ESS',
    };

    // Act
    const result = validateTelemetryPayload(input);

    // Assert
    expect(result).toEqual({
      valid: false,
      reason: 'latitude is required and must be a finite number',
    });
  });

  it('rejects coordinates outside allowed bounds', () => {
    // Arrange
    const input = {
      latitude: 95,
      longitude: 18.0686,
      timestamp: '2026-07-13T12:00:00.000Z',
      regionCode: 'SE-ESS',
    };

    // Act
    const result = validateTelemetryPayload(input);

    // Assert
    expect(result).toEqual({
      valid: false,
      reason: 'latitude is out of allowed range',
    });
  });

  it('preserves optional altitude, speed and heading when provided', () => {
    // Arrange
    const input = {
      latitude: 59.3293,
      longitude: 18.0686,
      timestamp: '2026-07-13T12:00:00.000Z',
      regionCode: 'SE-ESS',
      altitude: 120.5,
      speed: 32,
      heading: 270,
    };

    // Act
    const result = validateTelemetryPayload(input);

    // Assert
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.altitude).toBe(120.5);
      expect(result.payload.speed).toBe(32);
      expect(result.payload.heading).toBe(270);
    }
  });
});
