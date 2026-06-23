import pg from 'pg';
import { prisma, pubsub } from '../context';
import { publishDroneUpdated } from '../shared/publish-drone-updated';

export function startPgListener() {
  // Neon pooler does not forward LISTEN/NOTIFY — use a direct (non-pooler) URL when set.
  const connectionString = process.env.DATABASE_LISTEN_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('DATABASE_URL not set — PG LISTEN disabled');
    return;
  }

  if (connectionString.includes('-pooler')) {
    console.warn(
      'DATABASE_URL uses Neon pooler — PG LISTEN/NOTIFY will not work. ' +
      'Set DATABASE_LISTEN_URL to a direct Neon connection string, or rely on in-process publish.',
    );
  }

  const client = new pg.Client({ connectionString });

  client.connect().then(() => {
    client.query('LISTEN drone_updated');
    console.log('📡 Listening for drone_updated PostgreSQL notifications');
  }).catch((err) => {
    console.error('Failed to start PG listener:', err);
  });

  client.on('notification', async (msg) => {
    if (msg.channel !== 'drone_updated' || !msg.payload) return;

    try {
      const { droneId } = JSON.parse(msg.payload) as { droneId?: string };
      if (droneId) {
        await publishDroneUpdated(prisma, droneId);
      }
    } catch (err) {
      console.error('PG notification handler error:', err);
    }
  });

  client.on('error', (err) => {
    console.error('PG listener error:', err);
  });
}
