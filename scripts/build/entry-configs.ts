import forkbookConfig from '../../code/core/build-config.ts';
import type { BuildEntriesByPackageName } from './utils/entry-utils.ts';

export const buildEntries = {
  '@aussieljk/forkbook': forkbookConfig,
} satisfies BuildEntriesByPackageName;

export function isBuildEntries(key: string): key is keyof typeof buildEntries {
  return key in buildEntries;
}

export function hasPrebuild(
  entry: BuildEntriesByPackageName[keyof BuildEntriesByPackageName]
): entry is BuildEntriesByPackageName[keyof BuildEntriesByPackageName] & {
  prebuild: (cwd: string) => Promise<void>;
} {
  return 'prebuild' in entry;
}
