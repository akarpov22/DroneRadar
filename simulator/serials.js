/**
 * Unique serial per simulator instance (MQTT topic droneradar/telemetry/{serial}).
 */
export function buildDroneSerial(index, regionCode = 'SE') {
  const code = String(regionCode || 'SE').toUpperCase();
  return `${code}-SIM-${String(index + 1).padStart(3, '0')}`;
}

export function resolveDroneSerial({ serial, instanceIndex, regionCode = 'SE' }) {
  if (serial) {
    return serial;
  }
  if (instanceIndex !== undefined && instanceIndex !== '') {
    const parsed = Number(instanceIndex);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`FLEET_INSTANCE_INDEX must be a non-negative integer, got: ${instanceIndex}`);
    }
    return buildDroneSerial(parsed, regionCode);
  }
  return null;
}
