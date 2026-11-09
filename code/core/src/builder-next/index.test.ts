import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PREVIEW_GLOBALS_PATH,
  PREVIEW_ROUTE_FILES,
  bail,
  createStoryLoaderWriter,
  getIframeRedirectUrl,
  isViteOnlyAnnotation,
  start,
} from './index.ts';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'forkbook-builder-next-'));
  mkdirSync(join(dir, 'app'));
});
afterEach(async () => {
  await bail();
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

describe('getIframeRedirectUrl', () => {
  it('keeps the query string', () => {
    expect(getIframeRedirectUrl('/_forkbook', '/iframe.html?id=a--b&viewMode=story')).toBe(
      '/_forkbook/iframe?id=a--b&viewMode=story'
    );
    expect(getIframeRedirectUrl('/_forkbook', '/iframe.html')).toBe('/_forkbook/iframe');
  });
});

describe('isViteOnlyAnnotation', () => {
  it('drops the preview of nextjs-vite only', () => {
    expect(isViteOnlyAnnotation('/n/@aussieljk/forkbook/dist/nextjs-vite/preview.js')).toBe(true);
    expect(isViteOnlyAnnotation('@aussieljk/forkbook/nextjs-vite/preview')).toBe(true);
    expect(isViteOnlyAnnotation('/n/@aussieljk/forkbook/dist/react/entry-preview.js')).toBe(false);
  });
});

describe('createStoryLoaderWriter', () => {
  it('writes the loader only when the story files change', () => {
    const writer = createStoryLoaderWriter({
      projectDir: dir,
      basePath: '/_forkbook',
      workingDir: dir,
    });
    const index = { entries: { 'a--b': { importPath: './src/a.stories.tsx' } } };
    expect(writer.writeStories(index as never)).toBe(true);
    expect(writer.writeStories(index as never)).toBe(false);
    const text = readFileSync(join(writer.route.routeDir, PREVIEW_ROUTE_FILES.stories), 'utf8');
    expect(text).toContain('import("../../../../src/a.stories.tsx?forkbook")');
  });
});

describe('start', () => {
  function setup() {
    let listener: ((event?: { added: boolean; removed: boolean }) => void) | undefined;
    const index = { v: 1, entries: { 'a--b': { importPath: './src/a.stories.tsx' } } };
    const generator = {
      getIndex: vi.fn(async () => index),
      onInvalidated: vi.fn((fn) => {
        listener = fn;
        return () => (listener = undefined);
      }),
    };
    const values: Record<string, unknown> = {
      storyIndexGenerator: generator,
      previewAnnotations: [
        '/n/forkbook/dist/react/entry-preview.js',
        '/n/forkbook/dist/nextjs-vite/preview.js',
      ],
      frameworkOptions: {
        builderNext: { mocks: { previewAnnotations: ['/n/mocks/decorator.js'] } },
      },
      core: { channelOptions: { wsToken: 't', basePath: '/_forkbook' } },
      stories: ['../src/**/*.stories.tsx'],
    };
    const presets = {
      apply: vi.fn(async (name: string, fallback?: unknown) => values[name] ?? fallback),
    };
    const routes = new Map<string, (req: unknown, res: unknown) => unknown>();
    const router = { get: vi.fn((path: string, handler: never) => routes.set(path, handler)) };
    const options = {
      basePath: '/_forkbook',
      configDir: join(dir, '.forkbook'),
      configType: 'DEVELOPMENT',
      presets,
    };
    return {
      generator,
      index,
      options,
      router,
      routes,
      fire: (e?: { added: boolean; removed: boolean }) => listener?.(e),
    };
  }

  it('writes the route, the loader and the annotations, and registers the routes', async () => {
    vi.stubEnv('FORKBOOK_NEXT_PROJECT_DIR', dir);
    const { options, router, routes } = setup();
    await start({ startTime: process.hrtime(), options, router, server: {}, channel: {} } as never);
    const routeDir = join(dir, 'app', '(forkbook)', '%5Fforkbook', 'iframe');
    expect(readFileSync(join(routeDir, PREVIEW_ROUTE_FILES.page), 'utf8')).toContain(
      'ForkbookClient'
    );
    expect(readFileSync(join(routeDir, PREVIEW_ROUTE_FILES.stories), 'utf8')).toContain(
      'a.stories.tsx'
    );
    const annotations = readFileSync(join(routeDir, PREVIEW_ROUTE_FILES.annotations), 'utf8');
    expect(annotations).toContain('entry-preview.js');
    expect(annotations).toContain('mocks/decorator.js');
    expect(annotations).not.toContain('nextjs-vite');

    const res = { statusCode: 0, headers: {} as Record<string, string>, body: '' };
    const response = {
      set statusCode(code: number) {
        res.statusCode = code;
      },
      setHeader: (key: string, value: string) => (res.headers[key] = value),
      end: (body = '') => (res.body = body),
    };
    routes.get('/iframe.html')!({ url: '/iframe.html?id=a--b' }, response);
    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toBe('/_forkbook/iframe?id=a--b');

    await routes.get(PREVIEW_GLOBALS_PATH)!({}, response);
    const globals = JSON.parse(res.body);
    expect(globals).toMatchObject({
      CONFIG_TYPE: 'DEVELOPMENT',
      CHANNEL_OPTIONS: { wsToken: 't', basePath: '/_forkbook' },
    });
  });

  it('writes the loader again when a story file is added, not when one is edited', async () => {
    vi.stubEnv('FORKBOOK_NEXT_PROJECT_DIR', dir);
    const { options, router, index, fire, generator } = setup();
    await start({ startTime: process.hrtime(), options, router, server: {}, channel: {} } as never);
    const stories = join(
      dir,
      'app',
      '(forkbook)',
      '%5Fforkbook',
      'iframe',
      PREVIEW_ROUTE_FILES.stories
    );

    (index.entries as Record<string, { importPath: string }>)['c--d'] = {
      importPath: './src/c.stories.tsx',
    };
    fire({ added: false, removed: false });
    await vi.waitFor(() => expect(generator.getIndex).toHaveBeenCalledTimes(1));
    expect(readFileSync(stories, 'utf8')).not.toContain('c.stories.tsx');

    fire({ added: true, removed: false });
    await vi.waitFor(() => expect(readFileSync(stories, 'utf8')).toContain('c.stories.tsx'));
  });
});
