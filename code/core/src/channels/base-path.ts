/**
 * Helpers for the Forkbook base path. The Forkbook server mounts everything (manager, index.json,
 * manifests, thumbnails, statics, the channel) under one base path, `/_forkbook` by default. This
 * lets a host app (for example `next dev` through `withForkbook`) rewrite `<base>/*` to Forkbook.
 *
 * A normalised base path starts with `/` and has no trailing slash. The root is the empty string.
 * Next.js rewrites drop trailing slashes, so all paths here have none.
 *
 * This file has no imports, so the browser, the server and `next.config` can all use it.
 */

/** The base path that Forkbook uses when none is set. */
export const DEFAULT_BASE_PATH = '/_forkbook';

/** The path of the server channel (WebSocket), relative to the base path. */
export const CHANNEL_PATH_SEGMENT = '/fb-channel';

/**
 * Makes a base path normal: one leading slash, no trailing slash, no duplicate slashes. `'/'` and
 * `''` give `''` (the root). `undefined` gives {@link DEFAULT_BASE_PATH}.
 */
export function normalizeBasePath(basePath: string | undefined | null): string {
  if (basePath === undefined || basePath === null) {
    return DEFAULT_BASE_PATH;
  }
  const trimmed = basePath
    .trim()
    .split(/[?#]/)[0]
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '');
  if (trimmed === '') {
    return '';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Joins a base path and a path. The result has no trailing slash, except for the root `/`. */
export function joinBasePath(basePath: string, path = ''): string {
  const base = normalizeBasePath(basePath);
  const rest = path.replace(/^\/+/, '');
  if (!rest) {
    return base || '/';
  }
  return `${base}/${rest}`;
}

/**
 * Removes the base path from a request URL (path and query). Gives `undefined` when the URL is not
 * under the base path. `<base>`, `<base>/` and `<base>?q` all give a URL that starts with `/`.
 */
export function stripBasePath(basePath: string, url: string): string | undefined {
  const base = normalizeBasePath(basePath);
  if (!base) {
    return url.startsWith('/') ? url : `/${url}`;
  }
  if (!url.startsWith(base)) {
    return undefined;
  }
  const rest = url.slice(base.length);
  if (rest === '') {
    return '/';
  }
  if (rest[0] === '/') {
    return rest;
  }
  if (rest[0] === '?' || rest[0] === '#') {
    return `/${rest}`;
  }
  // For example `/_forkbookx`: a different path that only starts with the same text.
  return undefined;
}

/** The path of the server channel for a base path, for example `/_forkbook/fb-channel`. */
export function getChannelPath(basePath: string): string {
  return joinBasePath(basePath, CHANNEL_PATH_SEGMENT);
}

export interface ChannelUrlOptions {
  /** `http:`, `https:`, `ws:` or `wss:`. HTTP protocols change to the WebSocket protocols. */
  protocol: string;
  /** Host with the port, for example `localhost:3000`. */
  host: string;
  basePath: string;
  token?: string;
  page?: string;
}

/** The full WebSocket URL of the server channel. */
export function getChannelUrl({ protocol, host, basePath, token, page }: ChannelUrlOptions) {
  const wsProtocol = protocol === 'https:' || protocol === 'wss:' ? 'wss' : 'ws';
  const params = new URLSearchParams();
  if (token !== undefined) {
    params.set('token', token);
  }
  if (page !== undefined) {
    params.set('page', page);
  }
  const query = params.toString();
  return `${wsProtocol}://${host}${getChannelPath(basePath)}${query ? `?${query}` : ''}`;
}
