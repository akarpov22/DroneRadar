import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ROUTES } from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = join(__dirname, 'index.js');

const count = Number(process.argv[2] ?? process.env.FLEET_COUNT ?? 5);
if (!Number.isInteger(count) || count < 1) {
  throw new Error('Fleet count must be a positive integer (argv or FLEET_COUNT)');
}

const children = [];

function spawnDrone(index) {
  const serial = `SE-SIM-${String(index + 1).padStart(3, '0')}`;
  const routeIndex = index % ROUTES.length;
  const route = ROUTES[routeIndex];

  const child = spawn(process.execPath, [indexPath], {
    env: {
      ...process.env,
      DRONE_SERIAL: serial,
      ROUTE_INDEX: String(routeIndex),
      ROUTE_PHASE_MS: String(index * 90_000),
      REGION_CODE: process.env.REGION_CODE ?? 'SE',
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
  const typeTag = route.zoneType ? `[${route.zoneType}] ` : '';
  console.log(`[fleet] Started ${serial} → route #${routeIndex} ${typeTag}(${route.name})`);
}

console.log(`[fleet] Launching ${count} drone simulators (${ROUTES.length} Stockholm routes: CTR, RSTA, ATZ, NOTAM)`);

for (let i = 0; i < count; i += 1) {
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
