export const isAuth0Disabled = import.meta.env.VITE_AUTH0_DISABLED === 'true';

export function getAuth0Config() {
  if (isAuth0Disabled) return null;

  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  if (!domain || !clientId || !audience) {
    throw new Error('Missing VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, or VITE_AUTH0_AUDIENCE');
  }

  return { domain, clientId, audience };
}
