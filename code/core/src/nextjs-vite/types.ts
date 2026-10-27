import type { CompatibleString } from '@aussieljk/forkbook/internal/types';

import type { BuilderOptions } from '@aussieljk/forkbook/builder-vite';
import type { ForkbookConfig as StorybookConfigReactVite } from '@aussieljk/forkbook/react-vite';

import type { NextRouter } from 'next/router';

type FrameworkName = CompatibleString<'@aussieljk/forkbook/nextjs-vite'>;
type BuilderName = CompatibleString<'@aussieljk/forkbook/builder-vite'>;

export type FrameworkOptions = {
  /** The path to the Next.js configuration file. */
  nextConfigPath?: string;
  image?: {
    includeFiles?: string[];
    excludeFiles?: string[];
  };
  builder?: BuilderOptions;
};

type StorybookConfigFramework = {
  framework:
    | FrameworkName
    | {
        name: FrameworkName;
        options: FrameworkOptions;
      };
  core?: StorybookConfigReactVite['core'] & {
    builder?:
      | BuilderName
      | {
          name: BuilderName;
          options: BuilderOptions;
        };
  };
};

/** The interface for Forkbook configuration in `main.ts` files. */
export type ForkbookConfig = Omit<StorybookConfigReactVite, keyof StorybookConfigFramework> &
  StorybookConfigFramework;

export interface NextJsParameters {
  /**
   * Next.js framework configuration
   *
   * @see https://forkbook.ljk.dev/docs/get-started/frameworks/nextjs-vite
   */
  nextjs?: {
    /**
     * Enable App Directory features If your story imports components that use next/navigation, you
     * need to set this parameter to true
     */
    appDirectory?: boolean;

    /**
     * Next.js navigation configuration when using `next/navigation`. Please note that it can only
     * be used in components/pages in the app directory.
     */
    navigation?: Partial<NextRouter>;

    /** Next.js router configuration */
    router?: Partial<NextRouter>;
  };
}

export interface NextJsTypes {
  parameters: NextJsParameters;
}
