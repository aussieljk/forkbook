import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  PREVIEW_ROUTE_FILES,
  applyPreviewRouteMocks,
  findAppDir,
  generateAnnotationsCode,
  generateStoryLoaderCode,
  getPreviewRouteDir,
  getRouteSegments,
  getStoryImportPaths,
  ignoreInGit,
  removePreviewRoute,
  toImportSpecifier,
  writeIfChanged,
  writePreviewRoute,
} from './route.ts';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'forkbook-builder-next-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('route folders', () => {
  it('writes a leading underscore as %5F, so the folder is not private', () => {
    expect(getRouteSegments('/_forkbook')).toEqual(['%5Fforkbook']);
    expect(getRouteSegments('/docs/_ui')).toEqual(['docs', '%5Fui']);
    expect(getRouteSegments('/forkbook')).toEqual(['forkbook']);
  });

  it('puts the page in a route group under the app folder', () => {
    expect(getPreviewRouteDir('/p/app', '/_forkbook')).toBe('/p/app/(forkbook)/%5Fforkbook/iframe');
  });

  it('finds app before src/app, like Next.js', () => {
    expect(findAppDir(dir)).toBeUndefined();
    mkdirSync(join(dir, 'src', 'app'), { recursive: true });
    expect(findAppDir(dir)).toBe(join(dir, 'src', 'app'));
    mkdirSync(join(dir, 'app'));
    expect(findAppDir(dir)).toBe(join(dir, 'app'));
  });
});

describe('generateStoryLoaderCode', () => {
  const entries = {
    'b--one': { importPath: './src/B.stories.tsx' },
    'a--one': { importPath: './src/A.stories.tsx' },
    'a--two': { importPath: './src/A.stories.tsx' },
    'v--one': { importPath: 'virtual:some-stories' },
  };

  it('lists each story file once, sorted', () => {
    expect(getStoryImportPaths(entries)).toEqual([
      './src/A.stories.tsx',
      './src/B.stories.tsx',
      'virtual:some-stories',
    ]);
  });

  it('maps each import path to a lazy import relative to the route folder', () => {
    const code = generateStoryLoaderCode(entries, {
      workingDir: '/repo',
      routeDir: '/repo/app/(forkbook)/%5Fforkbook/iframe',
    });
    expect(code).toContain(`"./src/A.stories.tsx": () => import("../../../../src/A.stories.tsx"),`);
    expect(code).toContain(`"./src/B.stories.tsx": () => import("../../../../src/B.stories.tsx"),`);
    expect(code).toContain(`"virtual:some-stories": () => import("virtual:some-stories"),`);
    expect(code.match(/A\.stories/g)).toHaveLength(2);
    expect(code).toContain('export async function importFn(path)');
  });

  it('gives the same text for the same index, so a rewrite does not trigger a reload', () => {
    const options = { workingDir: '/repo', routeDir: '/repo/app/x' };
    const reversed = Object.fromEntries(Object.entries(entries).reverse());
    expect(generateStoryLoaderCode(reversed, options)).toBe(
      generateStoryLoaderCode(entries, options)
    );
  });

  it('gives an importFn that loads the file and fails clearly for an unknown path', async () => {
    const routeDir = join(dir, 'route');
    mkdirSync(routeDir);
    writeFileSync(join(dir, 'A.stories.mjs'), 'export const story = 1;');
    const file = join(routeDir, 'loader.mjs');
    writeFileSync(
      file,
      generateStoryLoaderCode(
        { a: { importPath: './A.stories.mjs' } },
        { workingDir: dir, routeDir }
      )
    );
    const { importFn } = await import(file);
    await expect(importFn('./A.stories.mjs')).resolves.toMatchObject({ story: 1 });
    await expect(importFn('./missing.mjs')).rejects.toThrow(/no story file/);
  });
});

describe('generateAnnotationsCode', () => {
  it('imports each annotation file and keeps package names', () => {
    const code = generateAnnotationsCode(
      ['@aussieljk/forkbook/react/entry-preview', '/repo/.forkbook/preview.tsx'],
      '/repo/app/(forkbook)/%5Fforkbook/iframe'
    );
    expect(code).toContain(
      `import * as annotations0 from "@aussieljk/forkbook/react/entry-preview";`
    );
    expect(code).toContain(`import * as annotations1 from "../../../../.forkbook/preview.tsx";`);
    expect(code).toContain('const modules = [annotations0, annotations1];');
  });
});

describe('toImportSpecifier', () => {
  it('adds ./ for a file in the same folder or below', () => {
    expect(toImportSpecifier('/a', '/a/b.ts')).toBe('./b.ts');
    expect(toImportSpecifier('/a/b', '/a/c.ts')).toBe('../c.ts');
    expect(toImportSpecifier('/a', 'react')).toBe('react');
  });
});

describe('writePreviewRoute', () => {
  it('writes the route files and removes them again', () => {
    mkdirSync(join(dir, 'app'));
    const route = writePreviewRoute({ projectDir: dir, basePath: '/_forkbook' });
    expect(route.routeDir).toBe(join(dir, 'app', '(forkbook)', '%5Fforkbook', 'iframe'));
    for (const name of Object.values(PREVIEW_ROUTE_FILES)) {
      expect(readFileSync(join(route.routeDir, name), 'utf8')).toContain('Generated by Forkbook');
    }
    const runtime = readFileSync(join(route.routeDir, PREVIEW_ROUTE_FILES.runtime), 'utf8');
    expect(runtime).toContain('"/_forkbook/iframe-globals.json"');
    expect(readFileSync(join(route.routeDir, PREVIEW_ROUTE_FILES.client), 'utf8')).toContain(
      'ssr: false'
    );

    removePreviewRoute(route);
    expect(findAppDir(dir)).toBe(join(dir, 'app'));
    expect(() => readFileSync(join(route.routeDir, PREVIEW_ROUTE_FILES.page))).toThrow();
  });

  it('keeps a loader module that the Forkbook server wrote', () => {
    mkdirSync(join(dir, 'app'));
    const route = writePreviewRoute({ projectDir: dir, basePath: '/_forkbook' });
    const stories = join(route.routeDir, PREVIEW_ROUTE_FILES.stories);
    writeFileSync(stories, '// real loader');
    writePreviewRoute({ projectDir: dir, basePath: '/_forkbook' });
    expect(readFileSync(stories, 'utf8')).toBe('// real loader');
  });

  it('fails clearly with no app folder', () => {
    expect(() => writePreviewRoute({ projectDir: dir, basePath: '/_forkbook' })).toThrow(
      /needs the App Router/
    );
  });
});

describe('writeIfChanged', () => {
  it('does not write the same text again', () => {
    const file = join(dir, 'x.js');
    expect(writeIfChanged(file, 'a')).toBe(true);
    expect(writeIfChanged(file, 'a')).toBe(false);
    expect(writeIfChanged(file, 'b')).toBe(true);
  });
});

describe('ignoreInGit', () => {
  it('adds the route group to .git/info/exclude once', () => {
    mkdirSync(join(dir, '.git', 'info'), { recursive: true });
    writeFileSync(join(dir, '.git', 'info', 'exclude'), '# existing');
    const group = join(dir, 'app', '(forkbook)');
    expect(ignoreInGit(group)).toBe(true);
    expect(ignoreInGit(group)).toBe(true);
    const text = readFileSync(join(dir, '.git', 'info', 'exclude'), 'utf8');
    expect(text.startsWith('# existing\n')).toBe(true);
    expect(text.match(/^\(forkbook\)\/$/gm)).toHaveLength(1);
  });

  it('follows the .git file of a worktree to the common folder', () => {
    const common = join(dir, 'main', '.git');
    const worktreeGit = join(common, 'worktrees', 'w');
    mkdirSync(worktreeGit, { recursive: true });
    writeFileSync(join(worktreeGit, 'commondir'), '../..');
    const tree = join(dir, 'tree');
    mkdirSync(join(tree, 'app'), { recursive: true });
    writeFileSync(join(tree, '.git'), `gitdir: ${worktreeGit}\n`);
    expect(ignoreInGit(join(tree, 'app', '(forkbook)'))).toBe(true);
    expect(readFileSync(join(common, 'info', 'exclude'), 'utf8')).toContain('(forkbook)/');
  });

  it('returns false outside a repository', () => {
    expect(ignoreInGit(join(tmpdir(), 'no-such-folder', 'app', '(forkbook)'))).toBe(false);
  });
});

describe('applyPreviewRouteMocks', () => {
  it('adds aliases, keeps the aliases of the app and makes absolute paths relative', () => {
    const config = { turbopack: { root: '/r', resolveAlias: { 'next/link': './app-link.ts' } } };
    const result = applyPreviewRouteMocks(
      config,
      {
        resolveAlias: {
          'next/link': '/p/mocks/link.ts',
          'node:fs': { browser: '/p/mocks/fs.ts' },
        },
      },
      '/p/web'
    );
    expect(result.turbopack).toEqual({
      root: '/r',
      resolveAlias: { 'next/link': './app-link.ts', 'node:fs': { browser: '../mocks/fs.ts' } },
    });
    expect(config.turbopack.resolveAlias).toEqual({ 'next/link': './app-link.ts' });
  });

  it('returns the config as it is with no aliases', () => {
    const config = { a: 1 };
    expect(applyPreviewRouteMocks(config, {})).toBe(config);
  });
});
