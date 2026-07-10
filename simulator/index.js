import 'dotenv/config';
import mqtt from 'mqtt';
import { buildRouteNavigator } from './geo.js';
import { getRouteByIndex, resolveRouteIndex, ROUTES } from './routes.js';
import { resolveDroneSerial } from './serials.js';

const mqttBrokerUrl = process.env.MQTT_BROKER_URL;
const regionCode = process.env.REGION_CODE;
const routeIndexEnv = process.env.ROUTE_INDEX;
const serial = resolveDroneSerial({
  serial: process.env.DRONE_SERIAL,
  instanceIndex: process.env.FLEET_INSTANCE_INDEX,
  regionCode,
});

if (!mqttBrokerUrl) {
  throw new Error('Missing required environment variable: MQTT_BROKER_URL');
}

if (mqttBrokerUrl.startsWith('mqtts://') || mqttBrokerUrl.startsWith('ssl://')) {
  throw new Error('Simulator uses plain mqtt:// on :1883 only — drones do not authenticate');
}

if (!serial) {
  throw new Error('Missing drone serial: set DRONE_SERIAL or FLEET_INSTANCE_INDEX');
}

if (!regionCode) {
  throw new Error('Missing required environment variable: REGION_CODE (ISO 3166-1 alpha-2, e.g. UA, SE)');
}

const sendIntervalMs = Number(process.env.SIMULATION_INTERVAL_MS ?? 500);
const speedMultiplier = Number(process.env.SIMULATION_SPEED_MULTIPLIER ?? 1);
const targetSpeedKmh = Number(process.env.SIMULATION_SPEED_KMH ?? 20);
const routePhaseMs = Number(process.env.ROUTE_PHASE_MS ?? 0);

const routeIndex = resolveRouteIndex(serial, routeIndexEnv);
const selectedRoute = getRouteByIndex(routeIndex);
const { getPosition: getRoutePosition } = buildRouteNavigator(
  selectedRoute.waypoints,
  targetSpeedKmh,
  speedMultiplier,
);

const telemetryTopic = `droneradar/telemetry/${serial}`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildMqttOptions() {
  return {
    clientId: `sim-${serial}`,
    connectTimeout: 30_000,
    reconnectPeriod: 3_000,
    protocolVersion: 4,
  };
}

function connectMqtt() {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(mqttBrokerUrl, buildMqttOptions());

    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error('MQTT connect timeout (30s)'));
    }, 30_000);

    let connected = false;

    client.on('connect', () => {
      connected = true;
      clearTimeout(timeout);
      resolve(client);
    });

    client.on('reconnect', () => {
      if (!connected) console.warn('MQTT reconnecting...');
    });

    client.on('error', (err) => {
      if (!connected) console.warn('MQTT error (will retry):', err.message);
    });

    client.on('close', () => {
      if (!connected) console.warn('MQTT connection closed');
    });
  });
}

async function main() {
  console.log('🔧 Starting drone simulation...');
  console.log(`📡 MQTT broker: ${mqttBrokerUrl}`);
  console.log(`🛰️ Topic: ${telemetryTopic}`);
  console.log(`🗺️ Route #${routeIndex}: ${selectedRoute.name} (${selectedRoute.waypoints.length} points)`);
  if (selectedRoute.demoKind) {
    console.log(`🔔 Demo: ${selectedRoute.demoKind}`);
  }
  if (selectedRoute.zoneType) {
    console.log(`🚫 Zone type: ${selectedRoute.zoneType} — ${selectedRoute.zoneLabel ?? ''}`);
  } else if (selectedRoute.zoneLabel) {
    console.log(`🚫 Crossing restriction zone: ${selectedRoute.zoneLabel}`);
  }
  console.log(`📋 ${ROUTES.length} routes available — each emulator instance = one drone`);
  console.log(`⏱️ Update interval: ${sendIntervalMs}ms, speed: ${targetSpeedKmh} km/h`);

  const mqttClient = await connectMqtt();
  console.log(`🚁 Drone serial "${serial}" connected to MQTT.`);
  if (routePhaseMs > 0) {
    console.log(`⏳ Route phase offset: ${Math.round(routePhaseMs / 1000)}s`);
  }

  const startedAt = Date.now() - routePhaseMs;

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
