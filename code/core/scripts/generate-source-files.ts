import { createRequire } from 'node:module';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { format } from 'oxfmt';
import { rolldown } from 'rolldown';
import { dedent } from 'ts-dedent';

import { rolldownCssPlugin } from '../../../scripts/build/utils/css-modules.ts';

const CODE_DIR = join(import.meta.dirname, '..', '..', '..', 'code');
const CORE_ROOT_DIR = join(CODE_DIR, 'core');

export const generateSourceFiles = async () => {
  // generateExportsFile scans core source (including the versions file) with
  // rolldown; write it first so the scan never observes it mid-rewrite.
  await generateVersionsFile();
  await generateExportsFile();
};

/**
 * Generated sources are read concurrently by other build steps (the rolldown
 * export scan below, and parallel package builds whose declaration emit
 * type-checks core source), and `fs.writeFile` truncates before writing, so a
 * plain overwrite exposes readers to an empty or partial file. Skip identical
 * content (the steady state) and otherwise swap the new content in atomically
 * via rename.
 */
async function writeGeneratedFile(destination: string, content: string): Promise<void> {
  const existing = await readFile(destination, 'utf8').catch(() => null);
  if (existing === content) {
    return;
  }
  const temp = `${destination}.tmp-${process.pid}`;
  await writeFile(temp, content);
  try {
    await rename(temp, destination);
  } catch {
    // Windows can refuse to replace a file that another process holds open
    // without delete sharing; fall back to a plain overwrite there.
    await writeFile(destination, content);
  }
}

async function generateVersionsFile(): Promise<void> {
  const destination = join(CORE_ROOT_DIR, 'src', 'common', 'versions.ts');

  const { version } = JSON.parse(await readFile(join(CORE_ROOT_DIR, 'package.json'), 'utf8'));
  const versions = JSON.stringify({ '@aussieljk/forkbook': version });

  const { code: formatted } = await format(
    'versions.ts',
    dedent`
      // auto generated file, do not edit
      export default ${versions};
    `,
    { singleQuote: true }
  );

  await writeGeneratedFile(destination, formatted);
}

const localAlias = {
  '@aussieljk/forkbook/internal': join(CORE_ROOT_DIR, 'src'),
  '@aussieljk/forkbook/theming': join(CORE_ROOT_DIR, 'src', 'theming'),
  '@aussieljk/forkbook/test': join(CORE_ROOT_DIR, 'src', 'test'),
  '@aussieljk/forkbook/test/preview': join(CORE_ROOT_DIR, 'src', 'test', 'preview'),
  '@aussieljk/forkbook/actions': join(CORE_ROOT_DIR, 'src', 'actions'),
  '@aussieljk/forkbook/preview-api': join(CORE_ROOT_DIR, 'src', 'preview-api'),
  '@aussieljk/forkbook/manager-api': join(CORE_ROOT_DIR, 'src', 'manager-api'),
  '@aussieljk/forkbook/open-service': join(CORE_ROOT_DIR, 'src', 'shared', 'open-service'),
  '@aussieljk/forkbook': join(CORE_ROOT_DIR, 'src'),
};
async function generateExportsFile(): Promise<void> {
  const destination = join(CORE_ROOT_DIR, 'src', 'manager', 'globals', 'exports.ts');
  const require = createRequire(join(CORE_ROOT_DIR, 'package.json'));

  const { globalPackages } = await import('../src/manager/globals/globals.ts');

  const input: Record<string, string> = {};
  const virtualModules: Record<string, string> = {};

  // The icons global holds only the icons that Forkbook uses, not the whole Phosphor package.
  const sources: Record<string, string> = {
    '@phosphor-icons/react': join(CORE_ROOT_DIR, 'src', 'manager', 'globals', 'icons.ts'),
  };

  for (const mod of globalPackages) {
    const key = mod.replace(/[/@]/g, '_');
    input[key] = `\0${key}`;
    virtualModules[`\0${key}`] = `export * from '${sources[mod] ?? mod}'`;
  }

  const bundle = await rolldown({
    input,
    resolve: { alias: localAlias },
    platform: 'browser',
    logLevel: 'silent',
    plugins: [
      rolldownCssPlugin(),
      {
        name: 'virtual',
        resolveId(id) {
          if (id.startsWith('\0')) return id;
        },
        load(id) {
          if (virtualModules[id]) return virtualModules[id];
        },
      },
    ],
  });

  const { output } = await bundle.generate({ format: 'esm' });

  const data: Record<string, string[]> = {};

  for (const chunk of output) {
    if (chunk.type !== 'chunk' || !chunk.isEntry) continue;
    const mod = globalPackages.find((m: string) => m.replace(/[/@]/g, '_') === chunk.name);
    if (!mod) continue;

    let exports = chunk.exports.filter((e: string) => e !== 'default').sort();

    // CJS modules don't expose ESM exports — fall back to require()
    if (exports.length === 0) {
      try {
        exports = Object.keys(require(mod))
          .filter((k) => k !== 'default' && k !== '__esModule')
          .sort();
      } catch {
        // ignore — module may not be requireable
      }
    }

    data[mod] = exports;
  }

  // Preserve key order from globalsNameReferenceMap for deterministic output
  const ordered = Object.fromEntries(globalPackages.map((mod: string) => [mod, data[mod]]));

  const { code: formatted } = await format(
    'exports.ts',
    dedent`
      // this file is generated by sourcefiles.ts
      // this is done to prevent runtime dependencies from making it's way into the build/start script of the manager
      // the manager builder needs to know which dependencies are 'globalized' in the ui

      export default ${JSON.stringify(ordered)} as const;
    `,
    { singleQuote: true }
  );

  await writeGeneratedFile(destination, formatted);
}

generateSourceFiles();
