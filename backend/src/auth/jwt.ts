import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { UserRole } from '@prisma/client';
import { getAuth0Config, isAuth0Disabled, ROLES_CLAIM } from './config';

const roleMap: Record<string, UserRole> = {
  admin: UserRole.ADMIN,
  pilot: UserRole.PILOT,
  observer: UserRole.OBSERVER,
};

export type AuthPayload = {
  sub: string;
  email?: string;
  roles: UserRole[];
};

function extractRoles(payload: JWTPayload): UserRole[] {
  const raw = payload[ROLES_CLAIM];
  const names = Array.isArray(raw) ? raw : [];
  const roles = names
    .map((name) => roleMap[String(name).toLowerCase()])
    .filter(Boolean) as UserRole[];

  return roles.length > 0 ? roles : [UserRole.OBSERVER];
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  const config = getAuth0Config();
  if (!config) return null;
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${config.domain}/.well-known/jwks.json`));
  }
  return jwks;
}

export async function verifyAccessToken(token: string): Promise<AuthPayload | null> {
  if (isAuth0Disabled()) {
    return {
      sub: 'dev-local-user',
      email: 'dev@local',
      roles: [UserRole.ADMIN],
    };
  }

  const config = getAuth0Config();
  const keys = getJwks();
  if (!config || !keys) return null;

  const { payload } = await jwtVerify(token, keys, {
    issuer: `https://${config.domain}/`,
    audience: config.audience,
  });

  return {
    sub: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email : undefined,
    roles: extractRoles(payload),
  };
}

export function extractBearerToken(authorization?: string): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
}
