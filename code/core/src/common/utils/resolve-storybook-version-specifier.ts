import {
  getStorybookVersionSpecifierFromAncestry,
  type ProcessAncestryEntry,
} from './get-storybook-version-specifier-from-ancestry.ts';

/** Set by the `storybook` dispatcher before it respawns `@aussieljk/forkbook/internal/cli-commands` or `@aussieljk/forkbook/internal/create`. */
export const FORKBOOK_VERSION_SPECIFIER_ENV = 'FORKBOOK_VERSION_SPECIFIER';

export const resolveStorybookVersionSpecifier = (
  ancestry: readonly ProcessAncestryEntry[] = [],
  env: NodeJS.ProcessEnv = process.env
): string | undefined => {
  const fromEnv = env[FORKBOOK_VERSION_SPECIFIER_ENV]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return getStorybookVersionSpecifierFromAncestry(ancestry);
};
