import type { IncomingMessage, ServerResponse } from 'node:http';

import { type HostValidationOptions, isValidHost } from './getHostValidationMiddleware.ts';

/** `Sec-Fetch-Site` values of a request that a page of this server, or no page, sent. */
const SAME_SITE_FETCH_VALUES = new Set(['same-origin', 'none']);

const firstHeader = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Tells if a request comes from a page of a different site. Tools that are not browsers (MCP
 * clients, `curl`) send no `Sec-Fetch-Site` and no `Origin`, so they pass.
 *
 * - `Sec-Fetch-Site` must be `same-origin` or `none`, or not set. A top-level GET navigation (a link
 *   from another site to an HTML page) is the exception: the page shows to the user, not to the
 *   other site, and it changes nothing.
 * - `Origin`, when set, must be a host that the dev server accepts (see {@link isValidHost}). An
 *   origin that is not a URL (for example `null` from a sandboxed frame) is cross-site.
 */
export function isCrossSiteRequest(
  req: Pick<IncomingMessage, 'headers' | 'method'>,
  hostValidation: HostValidationOptions
): boolean {
  const fetchSite = firstHeader(req.headers['sec-fetch-site'])?.trim().toLowerCase();
  if (fetchSite && !SAME_SITE_FETCH_VALUES.has(fetchSite)) {
    const method = req.method?.toUpperCase();
    const isNavigation =
      (method === 'GET' || method === 'HEAD') &&
      firstHeader(req.headers['sec-fetch-mode'])?.trim().toLowerCase() === 'navigate';
    if (!isNavigation) {
      return true;
    }
  }

  const origin = firstHeader(req.headers.origin);
  if (!origin) {
    return false;
  }
  try {
    return !isValidHost(new URL(origin).host, hostValidation);
  } catch {
    return true;
  }
}

/** The request body is larger than the limit of the route. */
export class RequestBodyTooLargeError extends Error {
  constructor(public readonly limit: number) {
    super(`Request body is larger than ${limit} bytes`);
    this.name = 'RequestBodyTooLargeError';
  }
}

/**
 * Reads the full request body, but stops at `maxBytes`. A `Content-Length` larger than the limit
 * fails before the body is read. Throws {@link RequestBodyTooLargeError} when the body is too large.
 */
export async function readRequestBody(
  req: AsyncIterable<unknown> & Pick<IncomingMessage, 'headers'>,
  maxBytes: number
): Promise<Buffer> {
  const declared = Number(firstHeader(req.headers['content-length']));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new RequestBodyTooLargeError(maxBytes);
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const data = typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array);
    size += data.length;
    if (size > maxBytes) {
      throw new RequestBodyTooLargeError(maxBytes);
    }
    chunks.push(data);
  }
  return Buffer.concat(chunks);
}

/**
 * Sends 413. The connection closes after the response, so the rest of the body that was not read
 * is not used as the next request.
 */
export function sendPayloadTooLarge(
  res: ServerResponse,
  error: RequestBodyTooLargeError,
  contentType: 'application/json' | 'text/plain' = 'text/plain'
) {
  res.writeHead(413, { 'Content-Type': contentType, Connection: 'close' });
  res.end(
    contentType === 'application/json' ? JSON.stringify({ error: error.message }) : error.message
  );
}
