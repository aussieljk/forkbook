import type { IncomingMessage, ServerResponse } from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import {
  type BasePathRequest,
  createBasePathMount,
  getForwardedHost,
  getPublicOrigin,
  getPublicUrl,
  isForwardedForOrigin,
  resolveBasePath,
} from './base-path.ts';

const request = (
  url: string,
  headers: Record<string, string> = {},
  remoteAddress = '127.0.0.1'
): BasePathRequest =>
  ({ url, method: 'GET', headers, socket: { remoteAddress } }) as unknown as BasePathRequest;

const response = () => {
  const res = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
  return res as unknown as ServerResponse & typeof res;
};

describe('resolveBasePath', () => {
  it('uses the CLI value, then main.ts, then the default', () => {
    expect(resolveBasePath('/cli/', '/main')).toBe('/cli');
    expect(resolveBasePath(undefined, 'main')).toBe('/main');
    expect(resolveBasePath(undefined, undefined)).toBe('/_forkbook');
    expect(resolveBasePath('/', undefined)).toBe('');
  });
});

describe('createBasePathMount', () => {
  const mount = createBasePathMount('/_forkbook');

  it('removes the base path and keeps it on the request', () => {
    for (const [url, expected] of [
      ['/_forkbook', '/'],
      ['/_forkbook/', '/'],
      ['/_forkbook/index.json', '/index.json'],
      ['/_forkbook/manifests/components.json', '/manifests/components.json'],
      ['/_forkbook/thumbnails/a.png', '/thumbnails/a.png'],
      ['/_forkbook/favicon.svg?status=active', '/favicon.svg?status=active'],
    ]) {
      const req = request(url);
      expect(mount(req, response())).toBe(false);
      expect(req.url).toBe(expected);
      expect(req.forkbookBasePath).toBe('/_forkbook');
    }
  });

  it('redirects a page outside the base path into it', () => {
    const res = response();
    expect(mount(request('/?path=/story/a'), res)).toBe(true);
    expect(res.statusCode).toBe(302);
    expect(res.setHeader).toHaveBeenCalledWith('Location', '/_forkbook?path=/story/a');

    const story = response();
    expect(mount(request('/_story/a', { accept: 'text/html' }), story)).toBe(true);
    expect(story.setHeader).toHaveBeenCalledWith('Location', '/_forkbook/_story/a');
  });

  it('lets other requests outside the base path pass as they are', () => {
    const req = request('/index.json');
    expect(mount(req, response())).toBe(false);
    expect(req.url).toBe('/index.json');
    expect(req.forkbookBasePath).toBeUndefined();
  });

  it('does nothing for the root base path', () => {
    const req = request('/_forkbook/index.json');
    expect(createBasePathMount('/')(req, response())).toBe(false);
    expect(req.url).toBe('/_forkbook/index.json');
  });
});

describe('forwarded host', () => {
  it('prefers x-forwarded-host over host', () => {
    expect(getForwardedHost({ host: 'localhost:6006' })).toBe('localhost:6006');
    expect(
      getForwardedHost({ host: 'localhost:6006', 'x-forwarded-host': 'app.localhost, proxy' })
    ).toBe('app.localhost');
  });

  it('makes absolute URLs for the host the browser sees', () => {
    const req = request('/', {
      host: 'localhost:6006',
      'x-forwarded-host': 'app.localhost:1355',
      'x-forwarded-proto': 'https',
    }) as unknown as IncomingMessage;
    expect(getPublicOrigin(req)).toBe('https://app.localhost:1355');
    expect(getPublicUrl(req, '/_forkbook', 'index.json')).toBe(
      'https://app.localhost:1355/_forkbook/index.json'
    );
  });

  it('trusts the forwarded host for the origin only from a local proxy', () => {
    const headers = { 'x-forwarded-host': 'app.localhost:1355' };
    expect(isForwardedForOrigin(request('/', headers), 'app.localhost:1355')).toBe(true);
    expect(isForwardedForOrigin(request('/', headers), 'evil.com')).toBe(false);
    expect(isForwardedForOrigin(request('/', headers, '10.0.0.5'), 'app.localhost:1355')).toBe(
      false
    );
    expect(isForwardedForOrigin(request('/'), 'app.localhost:1355')).toBe(false);
  });
});
