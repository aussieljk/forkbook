import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Checks that some areas of code/core/src import each other in one direction only. Each pair is
 * [lower, upper]: the upper area can import the lower area, but the lower area must not import the
 * upper area. Tests, stories and test fixtures are not checked.
 */
const SRC = join(import.meta.dirname, '../code/core/src');

const LAYERS: [lower: string, upper: string][] = [
  ['core-server', 'cli'],
  ['csf-tools', 'core-server'],
  ['node-logger', 'common'],
  ['core-events', 'preview-api'],
];

const SKIP_FILE = /\.(test|spec|stories)\.tsx?$|\.d\.ts$/;
const SKIP_DIR = new Set([
  '__tests__',
  '__mocks__',
  '__mockdata__',
  '__testfixtures__',
  'node_modules',
]);
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;
const PACKAGE = /^@aussieljk\/forkbook\/(?:internal\/)?([^/]+)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return SKIP_DIR.has(entry.name) ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx|mts|js)$/.test(entry.name) && !SKIP_FILE.test(entry.name) ? [path] : [];
  });
}

/** The area (first folder in src/) that a specifier in `file` points to, if any. */
function targetArea(file: string, specifier: string): string | undefined {
  if (specifier.startsWith('.')) {
    const target = relative(SRC, resolve(dirname(file), specifier));
    return target.startsWith('..') ? undefined : target.split(sep)[0];
  }
  return PACKAGE.exec(specifier)?.[1];
}

/** Every import in `from` that points into `to`, as `file: specifier`. */
function findImports(from: string, to: string): string[] {
  return sourceFiles(join(SRC, from)).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(SPECIFIER)]
      .filter(([, specifier]) => targetArea(file, specifier) === to)
      .map(([, specifier]) => `${relative(SRC, file)}: ${specifier}`)
  );
}

describe('import direction between areas', () => {
  it('finds the imports of the upper areas (the check works)', () => {
    expect(findImports('cli', 'core-server')).not.toEqual([]);
    expect(findImports('common', 'node-logger')).not.toEqual([]);
  });

  it.each(LAYERS)('%s does not import %s', (lower, upper) => {
    expect(findImports(lower, upper)).toEqual([]);
  });
});
