import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PHASE_DEVELOPMENT_SERVER,
  applyForkbookDevConfig,
  ensureForkbookServer,
  getForkbookDevArgs,
  getForkbookRewrites,
  getLockPath,
  getSiteHosts,
  mergeRewrites,
  readLock,
  withForkbook,
} from './index.ts';

const fakeChild = (pid: number) => {
  const child = new EventEmitter() as EventEmitter & { pid: number; kill: () => boolean };
  child.pid = pid;
  child.kill = () => true;
  return child as unknown as ChildProcess;
};

let cwd: string;
beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'forkbook-next-'));
  vi.stubEnv('FORKBOOK_PARENT_PID', '');
  vi.stubEnv('PORTLESS_URL', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(cwd, { recursive: true, force: true });
});

describe('getForkbookRewrites', () => {
  it('rewrites the base path with and without a sub path', () => {
    expect(getForkbookRewrites('/_forkbook/', 'http://127.0.0.1:6006/')).toEqual([
      { source: '/_forkbook', destination: 'http://127.0.0.1:6006/_forkbook' },
      { source: '/_forkbook/:path*', destination: 'http://127.0.0.1:6006/_forkbook/:path*' },
    ]);
  });

  it('does not allow the root, which would hide the app', () => {
    expect(() => getForkbookRewrites('/', 'http://127.0.0.1:6006')).toThrow(/basePath/);
  });
});

describe('mergeRewrites', () => {
  const ours = getForkbookRewrites('/_forkbook', 'http://127.0.0.1:1');
  const app = { source: '/a', destination: '/b' };

  it('puts Forkbook first in beforeFiles', () => {
    expect(mergeRewrites(undefined, ours)).toEqual({
      beforeFiles: ours,
      afterFiles: [],
      fallback: [],
    });
    expect(mergeRewrites({ beforeFiles: [app], fallback: [app] }, ours)).toEqual({
      beforeFiles: [...ours, app],
      afterFiles: [],
      fallback: [app],
    });
  });

  it('keeps a plain array as afterFiles', () => {
    expect(mergeRewrites([app], ours)).toEqual({
      beforeFiles: ours,
      afterFiles: [app],
      fallback: [],
    });
  });
});

describe('applyForkbookDevConfig', () => {
  it('sets the dev settings and keeps other keys', async () => {
    const config = applyForkbookDevConfig(
      {
        reactStrictMode: true,
        allowedDevOrigins: ['my.dev'],
        rewrites: async () => [{ source: '/x', destination: '/y' }],
      },
      { basePath: '/_forkbook', destination: 'http://127.0.0.1:6006', siteHosts: ['app.test'] }
    );
    expect(config.reactStrictMode).toBe(true);
    expect(config.skipTrailingSlashRedirect).toBe(true);
    expect(config.allowedDevOrigins).toEqual(
      expect.arrayContaining(['my.dev', 'app.test', 'localhost', '*.localhost'])
    );
    const rewrites = await config.rewrites!();
    expect(rewrites).toMatchObject({
      beforeFiles: [{ source: '/_forkbook' }, { source: '/_forkbook/:path*' }],
      afterFiles: [{ source: '/x' }],
    });
  });
});

describe('getSiteHosts', () => {
  it('adds the host of PORTLESS_URL without the port', () => {
    expect(getSiteHosts(['a.test:3000'], { PORTLESS_URL: 'http://app.localhost:1355' })).toEqual([
      'a.test',
      'app.localhost',
      'localhost',
      '127.0.0.1',
      '*.localhost',
    ]);
  });
});

describe('getForkbookDevArgs', () => {
  it('starts forkbook dev on the port and base path, with no prompts', () => {
    expect(getForkbookDevArgs({ port: 7000, basePath: '/_forkbook', configDir: '/p/.fb' })).toEqual(
      [
        'dev',
        '--port',
        '7000',
        '--exact-port',
        '--base-path',
        '/_forkbook',
        '--config-dir',
        '/p/.fb',
        '--ci',
        '--no-open',
        '--no-version-updates',
      ]
    );
  });
});

describe('ensureForkbookServer', () => {
  it('starts a child, writes the lock, and does not give it PORT or HOST', async () => {
    const spawnServer = vi.fn((_args: string[], _env: NodeJS.ProcessEnv) => fakeChild(process.pid));
    const handle = await ensureForkbookServer({
      cwd,
      basePath: '/_forkbook',
      configDir: '.forkbook',
      env: { PORT: '3000', HOST: '127.0.0.1', FOO: 'bar' },
      spawnServer,
    });
    expect(handle.reused).toBe(false);
    expect(handle.port).not.toBe(3000);
    expect(handle.origin).toBe(`http://127.0.0.1:${handle.port}`);
    const env = spawnServer.mock.calls[0][1];
    expect(env.PORT).toBeUndefined();
    expect(env.HOST).toBeUndefined();
    expect(env.FOO).toBe('bar');
    expect(env.FORKBOOK_PARENT_PID).toBe(String(process.pid));
    expect(readLock(getLockPath(cwd))).toMatchObject({
      pid: process.pid,
      port: handle.port,
      basePath: '/_forkbook',
      configDir: join(cwd, '.forkbook'),
    });
  });

  it('reuses a running child from the lock file', async () => {
    const spawnServer = vi.fn(() => fakeChild(process.pid));
    const first = await ensureForkbookServer({
      cwd,
      basePath: '/_forkbook',
      configDir: '.forkbook',
      env: {},
      spawnServer,
    });
    const second = await ensureForkbookServer({
      cwd,
      basePath: '/_forkbook',
      configDir: '.forkbook',
      env: {},
      spawnServer,
    });
    expect(spawnServer).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ reused: true, port: first.port, pid: process.pid });
  });

  it('starts a new child when the locked process is gone', async () => {
    const lockPath = getLockPath(cwd);
    await ensureForkbookServer({
      cwd,
      basePath: '/_forkbook',
      configDir: '.forkbook',
      env: {},
      spawnServer: () => fakeChild(process.pid),
    });
    // A pid that does not run.
    writeFileSync(
      lockPath,
      JSON.stringify({ ...readLock(lockPath), pid: 2 ** 22 + 12345, port: 1 })
    );
    const spawnServer = vi.fn(() => fakeChild(process.pid));
    const handle = await ensureForkbookServer({
      cwd,
      basePath: '/_forkbook',
      configDir: '.forkbook',
      port: 6123,
      env: {},
      spawnServer,
    });
    expect(spawnServer).toHaveBeenCalledTimes(1);
    expect(handle).toMatchObject({ reused: false, port: 6123 });
  });
});

describe('withForkbook', () => {
  const context = { defaultConfig: {} };

  it('keeps the config as it is outside next dev', async () => {
    const spawnServer = vi.fn();
    const input = { reactStrictMode: true };
    const config = await withForkbook(input, { cwd, spawnServer })(
      'phase-production-build',
      context
    );
    expect(config).toBe(input);
    expect(spawnServer).not.toHaveBeenCalled();
  });

  it('does nothing inside the Forkbook child', async () => {
    vi.stubEnv('FORKBOOK_PARENT_PID', '123');
    const spawnServer = vi.fn();
    const input = {};
    expect(await withForkbook(input, { cwd, spawnServer })(PHASE_DEVELOPMENT_SERVER, context)).toBe(
      input
    );
    expect(spawnServer).not.toHaveBeenCalled();
  });

  it('starts Forkbook and adds the rewrites in next dev', async () => {
    const extendConfig = vi.fn((config: object, _context: unknown) => ({
      ...config,
      extended: true,
    }));
    const config = await withForkbook(async (phase) => ({ fromFunction: phase }), {
      cwd,
      port: 6200,
      enablePreviewRoute: true,
      extendConfig,
      spawnServer: () => fakeChild(process.pid),
    })(PHASE_DEVELOPMENT_SERVER, context);
    expect(config).toMatchObject({
      fromFunction: PHASE_DEVELOPMENT_SERVER,
      skipTrailingSlashRedirect: true,
      extended: true,
    });
    expect(await (config.rewrites as () => Promise<unknown>)()).toMatchObject({
      beforeFiles: [
        { source: '/_forkbook', destination: 'http://127.0.0.1:6200/_forkbook' },
        { source: '/_forkbook/:path*', destination: 'http://127.0.0.1:6200/_forkbook/:path*' },
      ],
    });
    expect(extendConfig.mock.calls[0][1]).toMatchObject({
      basePath: '/_forkbook',
      destination: 'http://127.0.0.1:6200',
      options: { enablePreviewRoute: true },
    });
  });

  it('can point at a Forkbook that runs on its own', async () => {
    const config = await withForkbook({}, { startServer: false, port: 6006, basePath: '/sb/' })(
      PHASE_DEVELOPMENT_SERVER,
      context
    );
    expect(await (config.rewrites as () => Promise<unknown>)()).toMatchObject({
      beforeFiles: [{ source: '/sb', destination: 'http://127.0.0.1:6006/sb' }, {}],
    });
  });
});
