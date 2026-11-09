import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';

import { joinBasePath, normalizeBasePath, stripBasePath } from '../../channels/base-path.ts';

/** A request that came in under the base path. `forkbookBasePath` is the base that was removed. */
export type BasePathRequest = IncomingMessage & { forkbookBasePath?: string };

/**
 * Gives the base path to use: the CLI value first, then `core.basePath` from `main.ts`, then the
 * default (`/_forkbook`). The result is normalised.
 */
export function resolveBasePath(cliValue: string | undefined, coreValue: string | undefined) {
  return normalizeBasePath(cliValue ?? coreValue);
}

/**
 * Makes a request handler step that mounts the server under the base path once. It runs before the
 * router. A request under the base path loses the prefix, so every route (manager, index.json,
 * manifests, thumbnails, favicon, statics, the preview builder) stays at its old path. The removed
 * prefix is kept on `req.forkbookBasePath`.
 *
 * A page request (HTML) outside the base path is redirected into it. Other requests outside the
 * base path pass through as they are, so old clients that ask for `/index.json` still work.
 *
 * Returns true when the step has sent the response.
 */
export function createBasePathMount(basePath: string) {
  const base = normalizeBasePath(basePath);
  return (req: BasePathRequest, res: ServerResponse): boolean => {
    if (!base) {
      return false;
    }
    const url = req.url ?? '/';
    const stripped = stripBasePath(base, url);
    if (stripped !== undefined) {
      req.url = stripped;
      req.forkbookBasePath = base;
      return false;
    }
    const pathname = url.split(/[?#]/)[0];
    const isPage =
      (req.method === 'GET' || req.method === 'HEAD') &&
      (pathname === '/' ||
        (!pathname.split('/').pop()?.includes('.') &&
          !pathname.startsWith('/@') &&
          (req.headers.accept ?? '').includes('text/html')));
    if (isPage) {
      res.statusCode = 302;
      // No slash after the base, because Next.js rewrites drop trailing slashes.
      res.setHeader('Location', `${base}${pathname === '/' ? url.slice(1) : url}`);
      res.end();
      return true;
    }
    return false;
  };
}

/** The first value of a header that can hold a list (for example `x-forwarded-host: a, b`). */
const firstHeaderValue = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.split(',')[0]?.trim() || undefined;

/**
 * The host that the browser sees. A proxy in front of Forkbook (for example `next dev` through a
 * rewrite) sends `Host: localhost:<forkbook port>` and the site host in `x-forwarded-host`.
 */
export function getForwardedHost(headers: IncomingHttpHeaders): string | undefined {
  return firstHeaderValue(headers['x-forwarded-host']) ?? firstHeaderValue(headers.host);
}

/** The origin that the browser sees, for absolute URLs. Honours `x-forwarded-host` and `-proto`. */
export function getPublicOrigin(req: IncomingMessage): string {
  const host = getForwardedHost(req.headers) ?? 'localhost';
  const forwardedProto = firstHeaderValue(req.headers['x-forwarded-proto']);
  const encrypted = 'encrypted' in req.socket && Boolean(req.socket.encrypted);
  const protocol = forwardedProto ?? (encrypted ? 'https' : 'http');
  return `${protocol}://${host}`;
}

/** The absolute public URL of a path under the base path. */
export function getPublicUrl(req: IncomingMessage, basePath: string, path = ''): string {
  return `${getPublicOrigin(req)}${joinBasePath(basePath, path)}`;
}

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * True when a local proxy forwarded the request for the given origin host. Only a proxy on this
 * machine is trusted: a browser cannot set `x-forwarded-host` itself.
 */
export function isForwardedForOrigin(req: IncomingMessage, originHost: string): boolean {
  const forwarded = firstHeaderValue(req.headers['x-forwarded-host']);
  return (
    forwarded !== undefined &&
    forwarded === originHost &&
    LOOPBACK_ADDRESSES.has(req.socket?.remoteAddress ?? '')
  );
}
