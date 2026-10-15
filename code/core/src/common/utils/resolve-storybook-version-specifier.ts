import {
  getStorybookVersionSpecifierFromAncestry,
  type ProcessAncestryEntry,
} from './get-storybook-version-specifier-from-ancestry.ts';

/** Set by the `storybook` dispatcher before it respawns `storybook/internal/cli-commands` or `storybook/internal/create`. */
export const STORYBOOK_VERSION_SPECIFIER_ENV = 'STORYBOOK_VERSION_SPECIFIER';

export const resolveStorybookVersionSpecifier = (
  ancestry: readonly ProcessAncestryEntry[] = [],
  env: NodeJS.ProcessEnv = process.env
): string | undefined => {
  const fromEnv = env[STORYBOOK_VERSION_SPECIFIER_ENV]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return getStorybookVersionSpecifierFromAncestry(ancestry);
};
