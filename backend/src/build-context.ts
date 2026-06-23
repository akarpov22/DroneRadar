import { User, UserRole } from '@prisma/client';
import { prisma, pubsub, Context } from './context';
import { extractBearerToken, verifyAccessToken } from './auth/jwt';
import { syncUserFromAuth } from './auth/sync-user';
import { isAuth0Disabled } from './auth/config';

export async function buildContext(authHeader?: string, wsToken?: string): Promise<Context> {
  const token = extractBearerToken(authHeader) ?? wsToken ?? null;
  let user: User | null = null;

  if (token) {
    try {
      const auth = await verifyAccessToken(token);
      if (auth) {
        user = await syncUserFromAuth(prisma, auth);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('JWT verification failed:', message);
    }
  } else if (isAuth0Disabled()) {
    user = await syncUserFromAuth(prisma, {
      sub: 'dev-local-user',
      email: 'dev@local',
      roles: [UserRole.ADMIN],
    });
  }

  return { prisma, pubsub, user };
}
