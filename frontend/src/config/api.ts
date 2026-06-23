function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

function toWss(url: string): string {
  if (/^wss:\/\//i.test(url)) return url;
  if (/^ws:\/\//i.test(url)) return url.replace(/^ws:\/\//i, 'wss://');
  return toHttps(url).replace(/^https:\/\//i, 'wss://');
}

function urlsFromBase(base: string) {
  const normalized = base.replace(/\/+$/, '');
  const httpUri = `${toHttps(normalized)}/graphql`;
  return { httpUri, wsUri: toWss(httpUri) };
}

export function getGraphqlUrls(): { httpUri: string; wsUri: string } {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (base) {
    return urlsFromBase(base);
  }

  const rawHttp = import.meta.env.VITE_GRAPHQL_HTTP;
  const rawWs = import.meta.env.VITE_GRAPHQL_WS;

  if (!rawHttp || !rawWs) {
    throw new Error('Missing VITE_GRAPHQL_HTTP/VITE_GRAPHQL_WS or VITE_API_BASE_URL');
  }

  const useSecure =
    import.meta.env.PROD ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:');

  const httpUri = useSecure ? toHttps(rawHttp) : rawHttp;
  const wsUri = useSecure ? toWss(rawWs) : rawWs;

  if (import.meta.env.PROD) {
    if (!httpUri.startsWith('https://')) {
      throw new Error('Production GraphQL HTTP URL must use HTTPS');
    }
    if (!wsUri.startsWith('wss://')) {
      throw new Error('Production GraphQL WebSocket URL must use WSS');
    }
  }

  return { httpUri, wsUri };
}
