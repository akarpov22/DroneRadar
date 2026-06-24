import mqtt, { MqttClient } from 'mqtt';
import { prisma } from '../context';
import { resolveDroneForTelemetry } from './resolve-drone-for-telemetry';
import { ingestPosition } from './ingest-position';

const TELEMETRY_TOPIC_PREFIX = 'droneradar/telemetry/';

type TelemetryPayload = {
  regionCode?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp?: string;
};

let client: MqttClient | null = null;

function parseSerialFromTopic(topic: string): string | null {
  if (!topic.startsWith(TELEMETRY_TOPIC_PREFIX)) {
    return null;
  }

  const serial = topic.slice(TELEMETRY_TOPIC_PREFIX.length).trim();
  return serial.length > 0 ? serial : null;
}

function isValidPayload(payload: TelemetryPayload): payload is Required<
  Pick<TelemetryPayload, 'latitude' | 'longitude' | 'timestamp' | 'regionCode'>
> & TelemetryPayload {
  return (
    typeof payload.latitude === 'number'
    && typeof payload.longitude === 'number'
    && typeof payload.timestamp === 'string'
    && typeof payload.regionCode === 'string'
    && payload.regionCode.trim().length > 0
  );
}

async function handleMessage(topic: string, rawPayload: Buffer): Promise<void> {
  const serial = parseSerialFromTopic(topic);
  if (!serial) {
    console.warn(`MQTT: ignored message on unexpected topic: ${topic}`);
    return;
  }

  let payload: TelemetryPayload;
  try {
    payload = JSON.parse(rawPayload.toString()) as TelemetryPayload;
  } catch {
    console.warn(`MQTT: invalid JSON from serial ${serial}`);
    return;
  }

  if (!isValidPayload(payload)) {
    console.warn(`MQTT: invalid telemetry payload from serial ${serial}`);
    return;
  }

  const result = await resolveDroneForTelemetry(prisma, serial, payload.regionCode.trim());
  if (!result.ok) {
    const detail = result.detail ? ` (${result.detail})` : '';
    console.warn(`MQTT: rejected telemetry from serial ${serial}: ${result.reason}${detail}`);
    return;
  }

  try {
    await ingestPosition(prisma, {
      droneId: result.drone.id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      altitude: payload.altitude,
      heading: payload.heading,
      speed: payload.speed,
      timestamp: payload.timestamp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`MQTT: ingest failed for serial ${serial}: ${message}`);
  }
}

export function startMqttConsumer(): void {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    console.warn('MQTT_BROKER_URL not set — MQTT consumer disabled');
    return;
  }

  const topic = process.env.MQTT_TOPIC ?? 'droneradar/telemetry/#';
  const clientId = process.env.MQTT_CLIENT_ID ?? 'droneradar-backend';

  client = mqtt.connect(brokerUrl, {
    clientId,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log(`📡 MQTT connected to ${brokerUrl}`);
    client?.subscribe(topic, (err) => {
      if (err) {
        console.error(`MQTT subscribe failed for ${topic}:`, err);
        return;
      }
      console.log(`📡 MQTT subscribed to ${topic}`);
    });
  });

  client.on('message', (topic, message) => {
    void handleMessage(topic, message);
  });

  client.on('error', (err) => {
    console.error('MQTT client error:', err);
  });

  client.on('reconnect', () => {
    console.log('MQTT reconnecting...');
  });
}

export function stopMqttConsumer(): void {
  client?.end(true);
  client = null;
}
