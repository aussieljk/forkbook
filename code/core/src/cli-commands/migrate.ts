import { existsSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { glob } from 'tinyglobby';

/** The import rewrites of the `sed` codemod on the "Moving from Storybook" docs page. */
const IMPORT_RULES: [RegExp, string][] = [
  [/(['"])@storybook\/([a-z-]+)/g, '$1@aussieljk/forkbook/$2'],
  [/(['"])storybook\//g, '$1@aussieljk/forkbook/'],
];

/** `STORYBOOK_*` env vars and `__STORYBOOK_*` globals become `FORKBOOK_*` and `__FORKBOOK_*`. */
const ENV_RULE: [RegExp, string] = [/(?<![A-Za-z0-9])(_*)STORYBOOK_/g, '$1FORKBOOK_'];

/** The names that Forkbook changed: the config folders, the story list, the Metro wrapper and the config type. */
const NAME_RULES: [RegExp, string][] = [
  [/\.rnstorybook\b/g, '.rnforkbook'],
  [/(?<![\w-])\.storybook\b/g, '.forkbook'],
  [/storybook\.requires/g, 'forkbook.requires'],
  [
    /@storybook\/react-native\/metro\/withStorybook/g,
    '@aussieljk/forkbook/react-native/metro/withForkbook',
  ],
  [/withStorybook/g, 'withForkbook'],
  [/\bStorybookConfig\b/g, 'ForkbookConfig'],
];

/** The `storybook` and `sb-rn-get-stories` commands and the `storybook*` script names in package.json scripts. */
const SCRIPT_RULES: [RegExp, string][] = [
  [/\bsb-rn-get-stories\b/g, 'forkbook rn-stories'],
  [/(?<![\w@/.-])storybook(?=[\s:]|$)/g, 'forkbook'],
];

/** The folders and files that Forkbook renamed, from the old path to the new path. */
const MOVES: [string, string][] = [
  ['.storybook', '.forkbook'],
  ['.rnstorybook', '.rnforkbook'],
  ['.rnforkbook/storybook.requires.ts', '.rnforkbook/forkbook.requires.ts'],
  ['.rnforkbook/storybook.requires.js', '.rnforkbook/forkbook.requires.js'],
];

/** `sb-*` classes and `--sb-*` CSS variables become `fb-*` and `--fb-*`. */
const CSS_RULE: [RegExp, string] = [/(?<![\w-])(--)?sb-(?=[a-z])/g, '$1fb-'];

const SOURCE_GLOBS = ['**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts,mdx,css,scss,sass,less,html}', '.env*'];
const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/storybook-static/**',
];

const isStorybookPackage = (name: string) => name === 'storybook' || name.startsWith('@storybook/');

export interface MigrateOptions {
  cwd?: string;
  dryRun?: boolean;
  /** The Forkbook version to add. */
  version: string;
}

export interface MigrateResult {
  /** The folders and files that were renamed, as `old -> new`. */
  moved: string[];
  removedPackages: string[];
  addedPackage: string;
  changedFiles: string[];
  installCommand: string;
}

function apply(text: string, rules: [RegExp, string][]) {
  return rules.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

export function migrateSource(text: string) {
  // The Metro wrapper import goes first, before the general import rule changes its package name.
  return apply(text, [NAME_RULES[3], ...IMPORT_RULES, ...NAME_RULES, ENV_RULE, CSS_RULE]);
}

export function installCommand(cwd: string) {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm install';
  }
  if (existsSync(join(cwd, 'yarn.lock'))) {
    return 'yarn install';
  }
  if (existsSync(join(cwd, 'package-lock.json'))) {
    return 'npm install';
  }
  return 'bun install';
}

export async function migrate({
  cwd = process.cwd(),
  dryRun = false,
  version,
}: MigrateOptions): Promise<MigrateResult> {
  const changedFiles: string[] = [];
  const removedPackages: string[] = [];

  const packageJsonPath = join(cwd, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const deps: Record<string, string> | undefined = packageJson[field];
    for (const name of Object.keys(deps ?? {})) {
      if (deps && isStorybookPackage(name)) {
        delete deps[name];
        removedPackages.push(name);
      }
    }
  }
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    '@aussieljk/forkbook': `^${version}`,
  };
  if (packageJson.scripts) {
    packageJson.scripts = Object.fromEntries(
      Object.entries<string>(packageJson.scripts).map(([name, script]) => [
        apply(name, SCRIPT_RULES),
        apply(script, [ENV_RULE, ...NAME_RULES, ...SCRIPT_RULES]),
      ])
    );
  }
  const before = await readFile(packageJsonPath, 'utf8');
  const after = `${JSON.stringify(packageJson, null, 2)}\n`;
  if (after !== before) {
    changedFiles.push('package.json');
    if (!dryRun) {
      await writeFile(packageJsonPath, after);
    }
  }

  const moved: string[] = [];
  for (const [from, to] of MOVES) {
    const source = join(cwd, dryRun ? from.replace('.rnforkbook/', '.rnstorybook/') : from);
    if (existsSync(source) && !existsSync(join(cwd, to))) {
      moved.push(`${from} -> ${to}`);
      if (!dryRun) {
        await rename(source, join(cwd, to));
      }
    }
  }

  const files = await glob(SOURCE_GLOBS, { cwd, dot: true, ignore: IGNORE, absolute: true });
  for (const file of files.sort()) {
    const text = await readFile(file, 'utf8');
    const next = migrateSource(text);
    if (next !== text) {
      changedFiles.push(relative(cwd, file));
      if (!dryRun) {
        await writeFile(file, next);
      }
    }
  }

  return {
    moved,
    removedPackages,
    addedPackage: `@aussieljk/forkbook@^${version}`,
    changedFiles,
    installCommand: installCommand(cwd),
  };
}
