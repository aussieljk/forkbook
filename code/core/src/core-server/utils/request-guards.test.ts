import { PassThrough } from 'node:stream';
import type { IncomingMessage } from 'node:http';

import { describe, expect, it } from 'vitest';

import { isCrossSiteRequest, readRequestBody, RequestBodyTooLargeError } from './request-guards.ts';

const req = (headers: Record<string, string>, method = 'POST') =>
  ({ method, headers }) as unknown as IncomingMessage;

describe('isCrossSiteRequest', () => {
  it.each([
    [{}],
    [{ 'sec-fetch-site': 'same-origin' }],
    [{ 'sec-fetch-site': 'none' }],
    [{ origin: 'http://localhost:6006' }],
    [{ 'sec-fetch-site': 'same-origin', origin: 'http://localhost:6006' }],
  ])('allows %o', (headers) => {
    expect(isCrossSiteRequest(req(headers), {})).toBe(false);
  });

  it.each([
    [{ 'sec-fetch-site': 'cross-site' }],
    [{ 'sec-fetch-site': 'same-site' }],
    [{ origin: 'http://evil.example.com' }],
    [{ origin: 'null' }],
    [{ 'sec-fetch-site': 'same-origin', origin: 'http://evil.example.com' }],
  ])('rejects %o', (headers) => {
    expect(isCrossSiteRequest(req(headers), {})).toBe(true);
  });

  it('allows an origin in allowedHosts', () => {
    expect(
      isCrossSiteRequest(req({ origin: 'https://app.example.com' }), {
        allowedHosts: ['app.example.com'],
      })
    ).toBe(false);
  });

  it('allows a cross-site top-level GET navigation, but not a cross-site POST navigation', () => {
    const headers = { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' };
    expect(isCrossSiteRequest(req(headers, 'GET'), {})).toBe(false);
    expect(isCrossSiteRequest(req(headers, 'POST'), {})).toBe(true);
  });
});

describe('readRequestBody', () => {
  const stream = (body: string, headers: Record<string, string> = {}) => {
    const passThrough = new PassThrough();
    passThrough.end(Buffer.from(body));
    return Object.assign(passThrough, { headers }) as unknown as IncomingMessage;
  };

  it('reads a body that is not larger than the limit', async () => {
    expect((await readRequestBody(stream('hello'), 5)).toString()).toBe('hello');
  });

  it('fails when the body is larger than the limit', async () => {
    await expect(readRequestBody(stream('hello!'), 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError
    );
  });

  it('fails from Content-Length before it reads the body', async () => {
    const passThrough = new PassThrough();
    const request = Object.assign(passThrough, {
      headers: { 'content-length': '100' },
    }) as unknown as IncomingMessage;
    // The stream never ends, so the read would hang if the header was not checked first.
    await expect(readRequestBody(request, 10)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });
});
