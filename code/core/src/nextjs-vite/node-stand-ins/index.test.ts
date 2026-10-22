import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import nodePath from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { build } from 'vite';

import { createFs, path, setProjectRoot } from './index.ts';
import { nodeStandInsPlugin } from './plugin.ts';

// setProjectRoot replaces process.cwd, as it does in the browser. Put the real one back.
const realCwd = process.cwd;
afterEach(() => {
  process.cwd = realCwd;
});

describe('path stand-in', () => {
  beforeEach(() => setProjectRoot('/project'));

  it('matches node:path/posix', () => {
    const posix = nodePath.posix;
    const cases: string[][] = [
      ['a', 'b', '../c', './d.md'],
      ['/a/', 'b/'],
      ['', 'a'],
      ['a/..'],
      ['..', 'a'],
    ];
    for (const args of cases) expect(path.join(...args)).toBe(posix.join(...args));
    for (const p of ['/a/b/c.md', 'a/b/', '/a', 'a', '/', '.hidden', 'x.tar.gz']) {
      expect(path.dirname(p)).toBe(posix.dirname(p));
      expect(path.basename(p)).toBe(posix.basename(p));
      expect(path.extname(p)).toBe(posix.extname(p));
      expect(path.normalize(p)).toBe(posix.normalize(p));
    }
    expect(path.basename('/a/b.md', '.md')).toBe('b');
    expect(path.relative('/a/b/c', '/a/d')).toBe(posix.relative('/a/b/c', '/a/d'));
    expect(path.sep).toBe('/');
    expect(path.parse('/a/b.md')).toEqual(posix.parse('/a/b.md'));
  });

  it('resolves from the project root', () => {
    expect(path.resolve('content', 'x.md')).toBe('/project/content/x.md');
    expect(path.resolve('/other', '../x')).toBe('/x');
    expect(path.resolve()).toBe('/project');
    expect(process.cwd()).toBe('/project');
  });
});

describe('fs stand-in', () => {
  beforeEach(() => setProjectRoot('/project'));
  const fs = createFs({ './content/x.md': '# Hello', './data/a.json': '{"a":1}' });

  it('reads files with paths from the project root', async () => {
    expect(fs.readFileSync(path.join(process.cwd(), 'content/x.md'), 'utf8')).toBe('# Hello');
    expect(fs.readFileSync('content/x.md', { encoding: 'utf8' })).toBe('# Hello');
    expect(new TextDecoder().decode(fs.readFileSync('./data/a.json') as Uint8Array)).toBe(
      '{"a":1}'
    );
    await expect(fs.promises.readFile('/project/content/x.md', 'utf8')).resolves.toBe('# Hello');
    const data = await new Promise((done) =>
      fs.readFile('content/x.md', 'utf8', (_e, d) => done(d))
    );
    expect(data).toBe('# Hello');
  });

  it('knows which files and folders exist', () => {
    expect(fs.existsSync('/project/content/x.md')).toBe(true);
    expect(fs.existsSync('/project/content')).toBe(true);
    expect(fs.existsSync('/project/content/y.md')).toBe(false);
  });

  it('throws ENOENT for a missing file', () => {
    expect(() => fs.readFileSync('content/missing.md', 'utf8')).toThrow(
      expect.objectContaining({ code: 'ENOENT' })
    );
  });
});

describe('nodeStandInsPlugin', () => {
  let dir: string;
  afterAll(async () => dir && (await rm(dir, { recursive: true, force: true })));

  it('lets a server page read project files in a browser build', async () => {
    dir = await mkdtemp(nodePath.join(tmpdir(), 'forkbook-stand-ins-'));
    await mkdir(nodePath.join(dir, 'content'));
    await mkdir(nodePath.join(dir, 'node_modules/pkg'), { recursive: true });
    await writeFile(nodePath.join(dir, 'content/x.md'), '# From disk');
    await writeFile(nodePath.join(dir, 'node_modules/pkg/secret.md'), 'no');
    await writeFile(
      nodePath.join(dir, 'page.js'),
      `import { readFileSync, existsSync } from 'node:fs';
       import { readFile } from 'node:fs/promises';
       import { join } from 'path';
       export const text = readFileSync(join(process.cwd(), 'content/x.md'), 'utf8');
       export const asyncText = () => readFile(join(process.cwd(), 'content/x.md'), 'utf8');
       export const hasModules = existsSync(join(process.cwd(), 'node_modules/pkg/secret.md'));
       export const cwd = process.cwd();`
    );

    const outDir = nodePath.join(dir, 'out');
    await build({
      root: dir,
      logLevel: 'silent',
      configFile: false,
      resolve: {
        alias: {
          '@aussieljk/forkbook/nextjs-vite/node-stand-ins': fileURLToPath(
            new URL('./index.ts', import.meta.url)
          ),
        },
      },
      plugins: [nodeStandInsPlugin(dir)],
      build: {
        outDir,
        lib: { entry: nodePath.join(dir, 'page.js'), formats: ['es'], fileName: () => 'page.js' },
        minify: false,
      },
    });

    const output = await readFile(nodePath.join(outDir, 'page.js'), 'utf8');
    expect(output).not.toContain('secret.md?raw');
    const page = await import(pathToFileURL(nodePath.join(outDir, 'page.js')).href);
    expect(page.text).toBe('# From disk');
    await expect(page.asyncText()).resolves.toBe('# From disk');
    expect(page.hasModules).toBe(false);
    expect(page.cwd).toBe(dir.replace(/\\/g, '/'));
  });

  it('leaves a user alias in place', async () => {
    const plugin = nodeStandInsPlugin('/project');
    const resolveId = plugin.resolveId as (id: string, i?: string, o?: object) => unknown;
    expect(resolveId('node:fs', undefined, { ssr: true })).toBeNull();
    expect(resolveId('/project/.storybook/mocks/fs.ts', undefined, {})).toBeNull();
    expect(resolveId('node:fs', undefined, {})).toBe('/project/__forkbook_node_fs__.js');
  });
});
