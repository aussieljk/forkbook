// https://storybook.js.org/docs/react/addons/writing-presets
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PresetProperty } from '@aussieljk/forkbook/internal/types';

import type { StorybookConfigVite } from '@aussieljk/forkbook/builder-vite';

import semver from 'semver';
import vitePluginStorybookNextjs from '@aussieljk/forkbook/internal/nextjs-vite-plugin';

import { normalizePostCssConfig } from './find-postcss-config.ts';
import type { FrameworkOptions } from './types.ts';
import { getNextjsVersion } from './utils.ts';

export const core: PresetProperty<'core'> = {
  builder: import.meta.resolve('@aussieljk/forkbook/builder-vite'),
  renderer: import.meta.resolve('@aussieljk/forkbook/react/preset'),
};

export const previewAnnotations: PresetProperty<'previewAnnotations'> = (entry = []) => {
  const annotations = [
    ...entry,
    fileURLToPath(import.meta.resolve('@aussieljk/forkbook/nextjs-vite/preview')),
  ];

  const nextjsVersion = getNextjsVersion();
  const isNext16orNewer = semver.gte(nextjsVersion, '16.0.0');

  // TODO: Remove this once we only support Next.js v16 and above
  if (!isNext16orNewer) {
    annotations.push(
      fileURLToPath(import.meta.resolve('@aussieljk/forkbook/nextjs-vite/config/preview'))
    );
  }

  return annotations;
};

export const optimizeViteDeps = [
  '@aussieljk/forkbook/nextjs-vite/link.mock',
  '@aussieljk/forkbook/nextjs-vite/navigation.mock',
  '@aussieljk/forkbook/nextjs-vite/router.mock',
  '@aussieljk/forkbook/nextjs-vite > styled-jsx',
  '@aussieljk/forkbook/nextjs-vite > styled-jsx/style',
  '@opentelemetry/api',
];

export const viteFinal: StorybookConfigVite['viteFinal'] = async (config, options) => {
  const inlineOptions = config.css?.postcss;
  const searchPath = typeof inlineOptions === 'string' ? inlineOptions : config.root;

  if (searchPath) {
    await normalizePostCssConfig(searchPath);
  }

  const { nextConfigPath, image = {} } =
    await options.presets.apply<FrameworkOptions>('frameworkOptions');

  const nextDir = nextConfigPath ? dirname(nextConfigPath) : undefined;

  const vitePluginOptions = {
    image,
    dir: nextDir,
  };

  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        'styled-jsx': dirname(fileURLToPath(import.meta.resolve('styled-jsx/package.json'))),
        'styled-jsx/style': fileURLToPath(import.meta.resolve('styled-jsx/style')),
        'styled-jsx/style.js': fileURLToPath(import.meta.resolve('styled-jsx/style')),
      },
    },
    plugins: [...(config.plugins ?? []), vitePluginStorybookNextjs(vitePluginOptions)],
  };
};
