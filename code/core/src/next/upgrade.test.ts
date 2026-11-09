import http from 'node:http';
import net from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { getForkbookPublicUrl, getPublicOrigin } from './config.ts';
import { forwardUpgrades, isUnderBasePath } from './upgrade.ts';

const servers: net.Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((done) => s.close(done))));
});

const listen = <T extends net.Server>(server: T) =>
  new Promise<number>((done) => {
    servers.push(server);
    server.listen(0, '127.0.0.1', () => done((server.address() as net.AddressInfo).port));
  });

/** Sends a raw upgrade request and gives the first response bytes. */
const upgrade = (port: number, path: string) =>
  new Promise<string>((done, reject) => {
    const socket = net.connect({ host: '127.0.0.1', port }, () => {
      socket.write(
        `GET ${path} HTTP/1.1\r\nHost: app.localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`
      );
    });
    socket.once('data', (data) => {
      socket.destroy();
      done(data.toString());
    });
    socket.once('error', reject);
  });

describe('isUnderBasePath', () => {
  it('matches the base path and its sub paths only', () => {
    expect(isUnderBasePath('/_forkbook', '/_forkbook')).toBe(true);
    expect(isUnderBasePath('/_forkbook/fb-channel?x=1', '/_forkbook')).toBe(true);
    expect(isUnderBasePath('/_forkbookx', '/_forkbook')).toBe(false);
    expect(isUnderBasePath('/_next/webpack-hmr', '/_forkbook')).toBe(false);
  });
});

describe('forwardUpgrades', () => {
  it('sends upgrades under the base path to the child and others to the app', async () => {
    // The child: answers each upgrade with its path and the headers it got.
    const child = http.createServer();
    child.on('upgrade', (req, socket) => {
      socket.end(
        `HTTP/1.1 101 Switching Protocols\r\nX-Path: ${req.url}\r\nX-Host: ${req.headers.host}\r\nX-Forwarded: ${req.headers['x-forwarded-host']}\r\n\r\n`
      );
    });
    const childPort = await listen(child);
    forwardUpgrades('/_forkbook', childPort);

    const app = http.createServer();
    app.on('upgrade', (_req, socket) => socket.end('HTTP/1.1 400 App\r\n\r\n'));
    const appPort = await listen(app);

    const forwarded = await upgrade(appPort, '/_forkbook/fb-channel?token=1');
    expect(forwarded).toContain('101 Switching Protocols');
    expect(forwarded).toContain('X-Path: /_forkbook/fb-channel?token=1');
    expect(forwarded).toContain(`X-Host: 127.0.0.1:${childPort}`);
    expect(forwarded).toContain('X-Forwarded: app.localhost');

    expect(await upgrade(appPort, '/_next/webpack-hmr')).toContain('400 App');
  });
});

describe('getPublicOrigin', () => {
  it('prefers FORKBOOK_PUBLIC_URL, then PORTLESS_URL, then localhost and PORT', () => {
    expect(
      getPublicOrigin({ FORKBOOK_PUBLIC_URL: 'https://a.localhost/x', PORTLESS_URL: 'https://b' })
    ).toBe('https://a.localhost');
    expect(getPublicOrigin({ PORTLESS_URL: 'https://app.localhost:1355' })).toBe(
      'https://app.localhost:1355'
    );
    expect(getPublicOrigin({ PORT: '4000' })).toBe('http://localhost:4000');
    expect(getForkbookPublicUrl('/forkbook/', {})).toBe('http://localhost:3000/forkbook');
  });
});
