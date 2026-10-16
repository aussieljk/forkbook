import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

import { globToRegexp } from '@aussieljk/forkbook/internal/common';
import type { NormalizedStoriesSpecifier } from '@aussieljk/forkbook/internal/types';

const cwd = process.cwd();
const require = createRequire(import.meta.url);

export const toRequireContext = (
  specifier: Pick<NormalizedStoriesSpecifier, 'directory' | 'files'>
) => {
  const { directory, files } = specifier;

  // The importPathMatcher is a `./`-prefixed matcher that includes the directory
  // For `require.context()` we want the same thing, relative to directory
  const match = globToRegexp(`./${files}`);

  return {
    path: directory,
    recursive: files.includes('**') || files.split('/').length > 1,
    match,
  };
};

const supportedExtensions = ['js', 'jsx', 'ts', 'tsx', 'cjs', 'mjs'];

export function getFilePathExtension({ configPath }: { configPath: string }, fileName: string) {
  for (const ext of supportedExtensions) {
    if (existsSync(path.resolve(cwd, configPath, `${fileName}.${ext}`))) {
      return ext;
    }
  }
  return null;
}

export function ensureRelativePathHasDot(relativePath: string) {
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

export function getPreviewExists({ configPath }: { configPath: string }) {
  return !!getFilePathExtension({ configPath }, 'preview');
}

/** The upstream package names of the on-device addons, and where they are in Forkbook. */
const RENAMED_ADDONS: Record<string, string> = {
  '@storybook/addon-ondevice-controls': '@aussieljk/forkbook/addon-ondevice-controls',
  '@storybook/addon-ondevice-actions': '@aussieljk/forkbook/addon-ondevice-actions',
};

export function resolveAddonFile(
  addon: string | null,
  file: string,
  extensions = ['js', 'mjs', 'ts'],
  configPath: string
) {
  if (!addon || typeof addon !== 'string') return null;
  addon = RENAMED_ADDONS[addon] ?? addon;

  const resolvePaths = { paths: [cwd] };

  try {
    const basePath = `${addon}/${file}`;
    require.resolve(basePath, resolvePaths);
    return basePath;
  } catch {}

  for (const ext of extensions) {
    try {
      const filePath = `${addon}/${file}.${ext}`;
      require.resolve(filePath, resolvePaths);
      return filePath;
    } catch {}
  }

  // attempt to resolve as a relative path for local addons
  if (addon.startsWith('./') || addon.startsWith('../')) {
    if (getFilePathExtension({ configPath }, `${addon}/${file}`)) {
      return `${addon}/${file}`;
    }
  }

  return null;
}

export type Addon = string | { name: string; options?: Record<string, any> };

export function getAddonName(addon: Addon) {
  if (typeof addon === 'string') return addon;

  if (typeof addon === 'object' && addon.name && typeof addon.name === 'string') return addon.name;

  console.error('Invalid addon configuration', addon);

  return null;
}
