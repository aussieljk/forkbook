import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { convert } from '../convert.ts';
import { themeToCssVars } from '../css-vars.ts';
import { globalCss } from '../global.ts';
import darkThemeVars from '../themes/dark.ts';
import lightThemeVars from '../themes/light.ts';

const SRC = join(import.meta.dirname, '..', '..');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' || entry.name === '__mocks__' ? [] : sourceFiles(path);
    }
    return /\.(css|tsx?)$/.test(entry.name) && !/\.(test|stories)\./.test(entry.name) ? [path] : [];
  });

describe('themeToCssVars', () => {
  it('gives only --fb- variables, and the --sh- variables of sugar-high', () => {
    const names = Object.keys(themeToCssVars(convert(lightThemeVars)));

    expect(names.length).toBeGreaterThan(50);
    expect(names.filter((name) => !/^--(fb|sh)-/.test(name))).toEqual([]);
  });

  it('gives the same names for the light and the dark theme', () => {
    expect(Object.keys(themeToCssVars(convert(darkThemeVars))).sort()).toEqual(
      Object.keys(themeToCssVars(convert(lightThemeVars))).sort()
    );
  });

  // The manager was unstyled when the theme variables had another prefix than the CSS read.
  it('defines each --fb- variable that the CSS of the manager and the components reads', () => {
    const files = sourceFiles(SRC).map((file) => readFileSync(file, 'utf8'));
    const all = [globalCss, ...files].join('\n');

    // A name that ends with `-` is a template (`var(--fb-color-${name})`).
    const read = new Set(
      [...all.matchAll(/var\((--fb-[\w-]+)/g)]
        .map((match) => match[1])
        .filter((name) => !name.endsWith('-'))
    );
    const defined = new Set([
      ...Object.keys(themeToCssVars(convert(lightThemeVars))),
      // Set in a CSS rule (`--fb-x: ...`) or inline from TS (`'--fb-x'`).
      ...[...all.matchAll(/(--fb-[\w-]+)\s*:/g)].map((match) => match[1]),
      ...[...all.matchAll(/['"`](--fb-[\w-]+)['"`]/g)].map((match) => match[1]),
    ]);

    expect([...read].filter((name) => !defined.has(name)).sort()).toEqual([]);
  });
});
