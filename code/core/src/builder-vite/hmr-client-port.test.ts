import type { Server } from 'node:http';

import { describe, expect, it } from 'vitest';

import { getPublicClientPort } from './hmr-client-port.ts';
import { getDevHmrConfig } from './vite-server.ts';

describe('getPublicClientPort', () => {
  it('reads the port from PORTLESS_URL', () => {
    expect(getPublicClientPort({ PORTLESS_URL: 'https://app.localhost:1355' })).toBe(1355);
  });

  it('uses the default port of the protocol', () => {
    expect(getPublicClientPort({ PORTLESS_URL: 'https://app.example.com' })).toBe(443);
    expect(getPublicClientPort({ FORKBOOK_PUBLIC_URL: 'http://app.example.com/forkbook' })).toBe(
      80
    );
  });

  it('prefers PORTLESS_URL, then FORKBOOK_PUBLIC_URL', () => {
    expect(
      getPublicClientPort({
        PORTLESS_URL: 'http://a.localhost:1355',
        FORKBOOK_PUBLIC_URL: 'http://b:3000',
      })
    ).toBe(1355);
    expect(getPublicClientPort({ PORTLESS_URL: 'bad', FORKBOOK_PUBLIC_URL: 'http://b:3000' })).toBe(
      3000
    );
  });

  it('returns undefined with no env', () => {
    expect(getPublicClientPort({})).toBeUndefined();
  });
});

describe('getDevHmrConfig', () => {
  const server = {} as Server;

  it('sets clientPort from the env', () => {
    expect(getDevHmrConfig(undefined, 6006, server, { PORTLESS_URL: 'http://a:1355' })).toEqual({
      port: 6006,
      server,
      clientPort: 1355,
    });
  });

  it('sets no clientPort with no env', () => {
    expect(getDevHmrConfig(undefined, 6006, server, {})).toEqual({ port: 6006, server });
  });

  it('keeps a user hmr config', () => {
    expect(
      getDevHmrConfig({ clientPort: 9 }, 6006, server, { PORTLESS_URL: 'http://a:1' })
    ).toEqual({ clientPort: 9 });
    expect(getDevHmrConfig(false, 6006, server, {})).toBe(false);
  });
});
