export function getCorsOrigin(): string[] {
  const raw =
    process.env.CORS_ORIGINS ??
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '');
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
