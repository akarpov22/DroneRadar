import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FLEET_PLAN, ROUTES, printFleetCatalog, FLEET_SIZE, getFleetEntry } from './routes.js';
import { buildDroneSerial } from './serials.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = join(__dirname, 'index.js');

const regionCode = process.env.REGION_CODE ?? 'SE';
const count = Number(process.argv[2] ?? process.env.FLEET_COUNT ?? FLEET_SIZE);
if (!Number.isInteger(count) || count < 1) {
  throw new Error('Fleet count must be a positive integer (argv or FLEET_COUNT)');
}

const children = [];
const usedSerials = new Set();

function spawnDrone(fleetSlot) {
  const entry = getFleetEntry(fleetSlot);
  const serial = buildDroneSerial(entry.serialIndex, regionCode);
  if (usedSerials.has(serial)) {
    throw new Error(`Duplicate drone serial in fleet: ${serial}`);
  }
  usedSerials.add(serial);

  const route = ROUTES[entry.routeIndex];
  const routePhaseMs = route.fleetPhaseMs ?? 0;

  const { DRONE_SERIAL: _ignoredSerial, ...baseEnv } = process.env;

  const child = spawn(process.execPath, [indexPath], {
    env: {
      ...baseEnv,
      DRONE_SERIAL: serial,
      FLEET_INSTANCE_INDEX: String(entry.serialIndex),
      ROUTE_INDEX: String(entry.routeIndex),
      ROUTE_PHASE_MS: String(routePhaseMs),
      REGION_CODE: regionCode,
    },
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    console.log(`[fleet] ${serial} (${route.name}) stopped: code=${code ?? 'null'} signal=${signal ?? 'null'}`);
    const childIndex = children.indexOf(child);
    if (childIndex !== -1) children.splice(childIndex, 1);
    if (children.length === 0) process.exit(code ?? 0);
  });

  children.push(child);
  const typeTag = route.demoKind ? `[${route.demoKind}] ` : route.zoneType ? `[${route.zoneType}] ` : '';
  console.log(`[fleet] Started ${serial} → route #${entry.routeIndex} ${typeTag}(${route.name}), phase=${routePhaseMs}ms`);
}

printFleetCatalog(regionCode);

const spawnCount = Math.min(count, FLEET_PLAN.length);
for (let i = 0; i < spawnCount; i += 1) {
  spawnDrone(i);
}

function shutdown() {
  console.log('[fleet] Shutting down all simulators...');
  for (const child of children) {
    child.kill('SIGTERM');
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
