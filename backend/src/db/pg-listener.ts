import pg from 'pg';
import { prisma, pubsub } from '../context';
import { publishDroneUpdated } from '../shared/publish-drone-updated';

const PG_RECONNECT_MS = 5_000;

let listenClient: pg.Client | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = false;

function getListenConnectionString(): string | null {
  const connectionString = process.env.DATABASE_LISTEN_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('DATABASE_URL not set — PG LISTEN disabled');
    return null;
  }

  if (connectionString.includes('-pooler')) {
    console.warn(
      'DATABASE_URL uses Neon pooler — PG LISTEN/NOTIFY will not work. ' +
      'Set DATABASE_LISTEN_URL to a direct Neon connection string.',
    );
  }

  return connectionString;
}

function scheduleReconnect(): void {
  if (stopped || reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectPgListener();
  }, PG_RECONNECT_MS);
}

async function connectPgListener(): Promise<void> {
  const connectionString = getListenConnectionString();
  if (!connectionString || stopped) return;

  if (listenClient) {
    listenClient.removeAllListeners();
    listenClient.end().catch(() => {});
    listenClient = null;
  }

  const client = new pg.Client({ connectionString });
  listenClient = client;

  client.on('notification', async (msg) => {
    if (msg.channel !== 'drone_updated' || !msg.payload) return;

    try {
      const { droneId } = JSON.parse(msg.payload) as { droneId?: string };
      if (droneId) {
        const { evaluateDroneAlerts } = await import('../services/drone-alert-service');
        await evaluateDroneAlerts(prisma, droneId);
        await publishDroneUpdated(prisma, droneId);
      }
    } catch (err) {
      console.error('PG notification handler error:', err);
    }
  });

  client.on('error', (err) => {
    console.error('PG listener error:', err);
    scheduleReconnect();
  });

  client.on('end', () => {
    if (!stopped) {
      console.warn('PG listener disconnected — will reconnect');
      scheduleReconnect();
    }
  });

  try {
    await client.connect();
    await client.query('LISTEN drone_updated');
    console.log('📡 Listening for drone_updated PostgreSQL notifications');
  } catch (err) {
    console.error('Failed to start PG listener:', err);
    scheduleReconnect();
  }
}

export function startPgListener(): void {
  stopped = false;
  void connectPgListener();
}

export function stopPgListener(): void {
  stopped = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (listenClient) {
    listenClient.removeAllListeners();
    listenClient.end().catch(() => {});
    listenClient = null;
  }
}
