import type {
  CompatibleString,
  StorybookConfig as StorybookConfigBase,
} from '@aussieljk/forkbook/internal/types';

import type { BuilderOptions, StorybookConfigVite } from '@aussieljk/forkbook/builder-vite';

type FrameworkName = CompatibleString<'@aussieljk/forkbook/react-vite'>;
type BuilderName = CompatibleString<'@aussieljk/forkbook/builder-vite'>;

export type FrameworkOptions = {
  builder?: BuilderOptions;
  strictMode?: boolean;
};

type StorybookConfigFramework = {
  framework:
    | FrameworkName
    | {
        name: FrameworkName;
        options: FrameworkOptions;
      };
  core?: StorybookConfigBase['core'] & {
    builder?:
      | BuilderName
      | {
          name: BuilderName;
          options: BuilderOptions;
        };
  };
  features?: StorybookConfigBase['features'] & {
    /**
     * Enable the experimental `.test` function in CSF Next
     *
     * @see https://forkbook.ljk.dev/docs/api/main-config/main-config-features#experimentaltestsyntax
     */
    experimentalTestSyntax?: boolean;
  };
};

/** The interface for Forkbook configuration in `main.ts` files. */
export type StorybookConfig = Omit<
  StorybookConfigBase,
  keyof StorybookConfigVite | keyof StorybookConfigFramework
> &
  StorybookConfigVite &
  StorybookConfigFramework;
