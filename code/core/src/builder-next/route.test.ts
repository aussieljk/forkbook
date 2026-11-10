import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  PREVIEW_ROUTE_FILES,
  PREVIEW_MOCKS_LOADER_CODE,
  applyPreviewRouteMocks,
  type TurbopackConfigLike,
  getLocalPrefixes,
  tagPreviewImport,
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
    expect(code).toContain(
      `"./src/A.stories.tsx": () => import("../../../../src/A.stories.tsx?forkbook"),`
    );
    expect(code).toContain(
      `"./src/B.stories.tsx": () => import("../../../../src/B.stories.tsx?forkbook"),`
    );
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
    expect(code).toContain(
      `import * as annotations1 from "../../../../.forkbook/preview.tsx?forkbook";`
    );
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

describe('tagPreviewImport', () => {
  it('tags local files and leaves packages and node_modules as they are', () => {
    expect(tagPreviewImport('../src/Button.stories.tsx')).toBe(
      '../src/Button.stories.tsx?forkbook'
    );
    expect(tagPreviewImport('./a.ts?raw')).toBe('./a.ts?raw&forkbook');
    expect(tagPreviewImport('./a.ts?forkbook')).toBe('./a.ts?forkbook');
    expect(tagPreviewImport('@aussieljk/forkbook/react/preview')).toBe(
      '@aussieljk/forkbook/react/preview'
    );
    expect(tagPreviewImport('../../node_modules/x/preview.js')).toBe(
      '../../node_modules/x/preview.js'
    );
  });

  it('tags the story and preview imports of the generated modules', () => {
    const routeDir = join(dir, 'app', '(forkbook)', 'iframe');
    expect(
      generateStoryLoaderCode(
        { a: { importPath: './src/A.stories.tsx' } },
        { workingDir: dir, routeDir }
      )
    ).toContain('import("../../../src/A.stories.tsx?forkbook")');
    const annotations = generateAnnotationsCode(
      ['@aussieljk/forkbook/react/preview', join(dir, '.forkbook', 'preview.tsx')],
      routeDir
    );
    expect(annotations).toContain('from "@aussieljk/forkbook/react/preview";');
    expect(annotations).toContain('from "../../../.forkbook/preview.tsx?forkbook";');
  });
});

/** Loads the generated loader as a CommonJS module. */
function loadMocksLoader() {
  const file = join(dir, 'loader.cjs');
  writeFileSync(file, PREVIEW_MOCKS_LOADER_CODE);
  return createRequire(import.meta.url)(file) as ((
    this: { getOptions(): unknown; resourcePath: string },
    source: string
  ) => string) & {
    rewriteImports(source: string, options: unknown, resourcePath: string): string;
  };
}

describe('preview mocks loader', () => {
  const options = {
    aliases: { 'convex/react': '/p/web/mocks/convex-react.ts', 'node:fs': 'memfs' },
    localPrefixes: ['@/', '~/', '#'],
  };

  it('replaces the mocked imports and tags the local imports of a story graph module', () => {
    const loader = loadMocksLoader();
    const source = [
      `import { useQuery } from 'convex/react';`,
      `import * as fs from "node:fs";`,
      `import { Button } from './Button';`,
      `import { cn } from '@/lib/utils';`,
      `import './styles.css';`,
      `import logo from './logo.svg';`,
      `import React from 'react';`,
      `export * from '../shared';`,
      `const lazy = () => import('./Lazy.tsx');`,
      `const { a } = require("convex/react");`,
    ].join('\n');
    const result = loader.call(
      { getOptions: () => options, resourcePath: '/p/web/src/components/Button.stories.tsx' },
      source
    );
    expect(result.split('\n')).toEqual([
      `import { useQuery } from '../../mocks/convex-react.ts';`,
      `import * as fs from "memfs";`,
      `import { Button } from './Button?forkbook';`,
      `import { cn } from '@/lib/utils?forkbook';`,
      `import './styles.css';`,
      `import logo from './logo.svg';`,
      `import React from 'react';`,
      `export * from '../shared?forkbook';`,
      `const lazy = () => import('./Lazy.tsx?forkbook');`,
      `const { a } = require("../../mocks/convex-react.ts");`,
    ]);
  });

  it('leaves a module with no mocked or local imports as it is', () => {
    const { rewriteImports } = loadMocksLoader();
    const source = `import { useQuery } from 'convex/react';\n`;
    expect(rewriteImports(source, { aliases: {}, localPrefixes: [] }, '/p/a.ts')).toBe(source);
  });
});

describe('getLocalPrefixes', () => {
  it('reads tsconfig paths with comments', () => {
    writeFileSync(
      join(dir, 'tsconfig.json'),
      `{\n  // paths\n  "compilerOptions": { "paths": { "@app/*": ["./src/*"], "lib": ["./lib"], }, },\n}\n`
    );
    expect(getLocalPrefixes(dir)).toEqual(['@/', '~/', '#', '@app/', 'lib']);
  });
});

describe('applyPreviewRouteMocks', () => {
  it('scopes the mocks to the story graph with query rules, not the global resolveAlias', () => {
    const config = {
      turbopack: {
        root: '/r',
        resolveAlias: { 'next/link': './app-link.ts' },
        rules: { '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' }, '*.tsx': { loaders: ['x'] } },
      },
    };
    const result = applyPreviewRouteMocks(
      config,
      {
        resolveAlias: {
          'convex/react': join(dir, 'mocks', 'convex-react.ts'),
          'node:fs': { browser: './mocks/fs.ts' },
        },
      },
      dir
    );
    const turbopack = result.turbopack as { resolveAlias: unknown; rules: Record<string, any> };
    // The global alias map keeps only the aliases of the app, so the app pages keep the real modules.
    expect(turbopack.resolveAlias).toEqual({ 'next/link': './app-link.ts' });
    expect(turbopack.rules['*.svg']).toEqual({ loaders: ['@svgr/webpack'], as: '*.js' });
    const tsx = turbopack.rules['*.tsx'];
    expect(tsx).toHaveLength(3);
    expect(tsx[0]).toEqual({ loaders: ['x'] });
    const [browser, server] = tsx.slice(1);
    expect(browser.condition.all).toEqual([
      { not: 'foreign' },
      { query: /[?&]forkbook(?=&|$)/ },
      'browser',
    ]);
    expect(server.condition.all[2]).toEqual({ not: 'browser' });
    const loader = join(dir, 'node_modules', '.cache', 'forkbook', 'preview-mocks-loader.cjs');
    expect(browser.loaders[0].loader).toBe(loader);
    expect(readFileSync(loader, 'utf8')).toBe(PREVIEW_MOCKS_LOADER_CODE);
    expect(browser.loaders[0].options.aliases).toEqual({
      'convex/react': join(dir, 'mocks', 'convex-react.ts'),
      'node:fs': join(dir, 'mocks', 'fs.ts'),
    });
    // A browser-only mock keeps the real module on the server.
    expect(server.loaders[0].options.aliases).toEqual({
      'convex/react': join(dir, 'mocks', 'convex-react.ts'),
    });
    expect(Object.keys(turbopack.rules)).toEqual(
      expect.arrayContaining(['*.js', '*.jsx', '*.mjs', '*.ts', '*.tsx'])
    );
    expect(config.turbopack.rules['*.tsx']).toEqual({ loaders: ['x'] });
  });

  it('runs the loader only on the story graph, so app code keeps the real module', () => {
    const result = applyPreviewRouteMocks(
      {} as TurbopackConfigLike,
      { resolveAlias: { 'convex/react': './mocks/convex-react.ts' } },
      dir
    );
    expect(result.turbopack?.resolveAlias).toBeUndefined();
    const rule = (result.turbopack!.rules!['*.tsx'] as any[])[0];
    const query = rule.condition.all[1].query as RegExp;
    // Story graph modules are imported with the query.
    expect(query.test('?forkbook')).toBe(true);
    expect(query.test('?raw&forkbook')).toBe(true);
    // An app page imports its modules with no query, so the loader does not run on them.
    expect(query.test('')).toBe(false);
    expect(query.test('?forkbooks')).toBe(false);
  });

  it('returns the config as it is with no aliases', () => {
    const config = { a: 1 };
    expect(applyPreviewRouteMocks(config, {})).toBe(config);
  });
});
