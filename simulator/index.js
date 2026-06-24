import 'dotenv/config';
import mqtt from 'mqtt';

const mqttBrokerUrl = process.env.MQTT_BROKER_URL;
const serial = process.env.DRONE_SERIAL;
const regionCode = process.env.REGION_CODE;

if (!mqttBrokerUrl) {
  throw new Error('Missing required environment variable: MQTT_BROKER_URL');
}

if (!serial) {
  throw new Error('Missing required environment variable: DRONE_SERIAL');
}

if (!regionCode) {
  throw new Error('Missing required environment variable: REGION_CODE (ISO 3166-1 alpha-2, e.g. UA, SE)');
}

const sendIntervalMs = Number(process.env.SIMULATION_INTERVAL_MS ?? 500);
const speedMultiplier = Number(process.env.SIMULATION_SPEED_MULTIPLIER ?? 1);
const targetSpeedKmh = Number(process.env.SIMULATION_SPEED_KMH ?? 20);

const route = [
  { latitude: 59.3293, longitude: 18.0686, altitude: 105 },
  { latitude: 59.3319, longitude: 18.0718, altitude: 118 },
  { latitude: 59.3357, longitude: 18.0754, altitude: 130 },
  { latitude: 59.3403, longitude: 18.0735, altitude: 122 },
  { latitude: 59.3385, longitude: 18.0701, altitude: 112 },
  { latitude: 59.3334, longitude: 18.0680, altitude: 108 },
];

const telemetryTopic = `droneradar/telemetry/${serial}`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

function distanceMeters(from, to) {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function segmentDurationMs(from, to) {
  const targetSpeedMetersPerSecond = targetSpeedKmh / 3.6;

  return distanceMeters(from, to) / targetSpeedMetersPerSecond * 1000;
}

const routeDurationMs = route.reduce((sum, point, index) => {
  const nextPoint = route[(index + 1) % route.length];

  return sum + segmentDurationMs(point, nextPoint);
}, 0);

function bearingDegrees(from, to) {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function getRoutePosition(elapsedMs) {
  let timeOnRouteMs = (elapsedMs * speedMultiplier) % routeDurationMs;

  for (let index = 0; index < route.length; index += 1) {
    const from = route[index];
    const to = route[(index + 1) % route.length];
    const durationMs = segmentDurationMs(from, to);

    if (timeOnRouteMs > durationMs) {
      timeOnRouteMs -= durationMs;
      continue;
    }

    const progress = timeOnRouteMs / durationMs;
    const speedKmh = targetSpeedKmh * speedMultiplier;
    const liveWave = Math.sin(elapsedMs / 4500);

    return {
      latitude: lerp(from.latitude, to.latitude, progress),
      longitude: lerp(from.longitude, to.longitude, progress),
      altitude: lerp(from.altitude, to.altitude, progress) + liveWave * 1.5,
      speed: speedKmh + Math.sin(elapsedMs / 3000) * 0.7,
      heading: bearingDegrees(from, to),
    };
  }

  return route[0];
}

function connectMqtt() {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(mqttBrokerUrl, {
      username: serial,
      reconnectPeriod: 5000,
    });

    client.on('connect', () => resolve(client));
    client.on('error', reject);
  });
}

async function main() {
  console.log('🔧 Starting drone simulation...');
  console.log(`📡 MQTT broker: ${mqttBrokerUrl}`);
  console.log(`🛰️ Topic: ${telemetryTopic}`);
  console.log(`🗺️ Route points: ${route.length}, update interval: ${sendIntervalMs}ms, speed: ${targetSpeedKmh} km/h`);

  const mqttClient = await connectMqtt();
  console.log(`🚁 Drone serial "${serial}" connected to MQTT.`);

  const startedAt = Date.now();

  while (true) {
    const position = getRoutePosition(Date.now() - startedAt);
    const payload = {
      latitude: Number(position.latitude.toFixed(6)),
      longitude: Number(position.longitude.toFixed(6)),
      altitude: Number(position.altitude.toFixed(1)),
      speed: Number(position.speed.toFixed(1)),
      heading: Number(position.heading.toFixed(1)),
      timestamp: new Date().toISOString(),
      regionCode,
    };

    await new Promise((resolve, reject) => {
      mqttClient.publish(telemetryTopic, JSON.stringify(payload), { qos: 0 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('📡 Sent position:', payload);
    await delay(sendIntervalMs);
  }
}

main().catch(console.error);
