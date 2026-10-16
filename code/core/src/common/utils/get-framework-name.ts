import type { Options } from '@aussieljk/forkbook/internal/types';

import { dedent } from 'ts-dedent';

import { frameworkPackages } from './get-storybook-info.ts';
import { normalizePath } from './normalize-path.ts';

/** Framework can be a string or an object. This utility always returns the string name. */
export async function getFrameworkName(options: Options) {
  const framework = await options.presets.apply('framework', '', options);

  if (!framework) {
    throw new Error(dedent`
      You must specify a framework in '.forkbook/main.js' config.

      https://forkbook.ljk.dev/docs/migration#framework-field-mandatory
    `);
  }

  return typeof framework === 'object' ? framework.name : framework;
}

/** The Storybook framework names that Forkbook accepts, and the Forkbook name of each. */
const storybookFrameworkNames: Record<string, string> = {
  '@storybook/react-vite': '@aussieljk/forkbook/react-vite',
  '@storybook/nextjs-vite': '@aussieljk/forkbook/nextjs-vite',
};

type FrameworkField = string | { name: string; options?: any } | undefined;

/** The `framework` field of a main config, with a Storybook name changed to its Forkbook name. */
export function forkbookFramework<T extends FrameworkField>(framework: T): T {
  const name = typeof framework === 'string' ? framework : framework?.name;
  const forkbookName = name ? storybookFrameworkNames[name] : undefined;
  if (!forkbookName) {
    return framework;
  }
  return (
    typeof framework === 'string'
      ? forkbookName
      : { ...(framework as { name: string }), name: forkbookName }
  ) as T;
}

/** A main config (or preset) with a Storybook framework name changed to its Forkbook name. */
export function withForkbookFramework<T extends { framework?: FrameworkField }>(config: T): T {
  const framework = forkbookFramework(config?.framework);
  return framework === config?.framework ? config : ({ ...(config as object), framework } as T);
}

/**
 * Extracts the proper framework name from the given framework field. The framework field can be the
 * framework package name or a path to the framework package.
 *
 * @example
 *
 * ```ts
 * extractFrameworkPackageName('/path/to/@storybook/react-vite'); // => '@aussieljk/forkbook/react-vite'
 * extractFrameworkPackageName('@third-party/framework'); // => '@third-party/framework'
 * ```
 */
export const extractFrameworkPackageName = (framework: string) => {
  const normalizedPath = normalizePath(forkbookFramework(framework));
  const frameworkName = Object.keys(frameworkPackages).find((pkg) => normalizedPath.endsWith(pkg));

  return frameworkName ?? framework;
};
