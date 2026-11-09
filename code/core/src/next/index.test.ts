import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PHASE_DEVELOPMENT_SERVER,
  applyForkbookDevConfig,
  ensureForkbookServer,
  findFreePort,
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

describe('getForkbookRewrites with excluded segments', () => {
  // The path-to-regexp copy of Next.js, which compiles the rewrite sources.
  const require = createRequire(import.meta.url);
  const { pathToRegexp } = require('next/dist/compiled/path-to-regexp') as {
    pathToRegexp: (path: string, keys?: unknown[]) => RegExp;
  };
  const [, rewrite] = getForkbookRewrites('/_forkbook', 'http://127.0.0.1:6006', ['iframe']);
  const matches = (path: string) => pathToRegexp(rewrite.source, []).test(path);

  it('sends every path to Forkbook except <base>/iframe', () => {
    expect(matches('/_forkbook/index.json')).toBe(true);
    expect(matches('/_forkbook/iframe.html')).toBe(true);
    expect(matches('/_forkbook/iframes')).toBe(true);
    expect(matches('/_forkbook/fb-channel')).toBe(true);
    expect(matches('/_forkbook/iframe')).toBe(false);
    expect(matches('/_forkbook/iframe/x')).toBe(false);
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

  it('starts a new child when the locked process runs but its port does not answer', async () => {
    const lockPath = getLockPath(cwd);
    const closedPort = await findFreePort();
    // The pid runs (this process), but nothing listens on the port, and the start was long ago.
    mkdirSync(join(cwd, 'node_modules', '.cache', 'forkbook'), { recursive: true });
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: process.pid,
        ownerPid: process.pid,
        port: closedPort,
        basePath: '/_forkbook',
        configDir: join(cwd, '.forkbook'),
        startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      })
    );
    const spawnServer = vi.fn(() => fakeChild(process.pid));
    const handle = await ensureForkbookServer({
      cwd,
      basePath: '/_forkbook',
      configDir: '.forkbook',
      port: 6124,
      env: {},
      spawnServer,
    });
    expect(spawnServer).toHaveBeenCalledTimes(1);
    expect(handle).toMatchObject({ reused: false, port: 6124 });
  });

  it('reuses a locked child that still starts, before its port answers', async () => {
    const lockPath = getLockPath(cwd);
    mkdirSync(join(cwd, 'node_modules', '.cache', 'forkbook'), { recursive: true });
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: process.pid,
        ownerPid: process.pid,
        port: await findFreePort(),
        basePath: '/_forkbook',
        configDir: join(cwd, '.forkbook'),
        startedAt: new Date().toISOString(),
      })
    );
    const spawnServer = vi.fn(() => fakeChild(process.pid));
    const handle = await ensureForkbookServer({
      cwd,
      basePath: '/_forkbook',
      configDir: '.forkbook',
      env: {},
      spawnServer,
    });
    expect(spawnServer).not.toHaveBeenCalled();
    expect(handle.reused).toBe(true);
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
      configDir: '.fb',
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
      options: { configDir: '.fb' },
    });
  });

  it('writes the preview route and leaves <base>/iframe to Next.js', async () => {
    const project = join(cwd, 'web');
    mkdirSync(join(project, 'app'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(project);
    const spawnServer = vi.fn((_args: string[], _env: NodeJS.ProcessEnv) => fakeChild(process.pid));
    const config = await withForkbook(
      { turbopack: { root: cwd } },
      {
        cwd,
        port: 6201,
        enablePreviewRoute: true,
        previewMocks: { resolveAlias: { 'node:fs': { browser: join(cwd, 'mocks', 'fs.ts') } } },
        spawnServer,
      }
    )(PHASE_DEVELOPMENT_SERVER, context);
    vi.mocked(process.cwd).mockRestore();

    const routeDir = join(project, 'app', '(forkbook)', '%5Fforkbook', 'iframe');
    expect(existsSync(join(routeDir, 'page.tsx'))).toBe(true);
    expect(spawnServer.mock.calls[0][1]).toMatchObject({
      FORKBOOK_NEXT_PROJECT_DIR: project,
      FORKBOOK_NEXT_APP_DIR: join(project, 'app'),
    });
    const rewrites = (await (config.rewrites as () => Promise<{ beforeFiles: unknown[] }>)())
      .beforeFiles;
    expect(rewrites[1]).toEqual({
      source: '/_forkbook/:path((?!(?:iframe)(?:/|$)).*)',
      destination: 'http://127.0.0.1:6201/_forkbook/:path',
    });
    // The mocks apply only to the story graph, through a loader rule, not a global alias.
    const turbopack = config.turbopack as { root: string; resolveAlias?: unknown; rules: object };
    expect(turbopack.root).toBe(cwd);
    expect(turbopack.resolveAlias).toBeUndefined();
    expect(JSON.stringify(turbopack.rules['*.tsx' as keyof object])).toContain(
      'preview-mocks-loader.cjs'
    );
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
