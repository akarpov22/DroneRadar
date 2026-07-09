export const ROLES_CLAIM = 'https://droneradar/roles';
export const EMAIL_CLAIM = 'https://droneradar/email';

export function isAuth0Disabled(): boolean {
  return process.env.AUTH0_DISABLED === 'true';
}

export function getAuth0Config() {
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;

  if (isAuth0Disabled()) {
    return null;
  }

  if (!domain || !audience) {
    throw new Error('AUTH0_DOMAIN and AUTH0_AUDIENCE are required (or set AUTH0_DISABLED=true for local dev)');
  }

  return { domain, audience };
}
