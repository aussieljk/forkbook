import type { PresetConfig } from '@aussieljk/forkbook/internal/types';

import { buildDevStandalone } from './build-dev.ts';
import { buildIndexStandalone } from './build-index.ts';
import { buildStaticStandalone } from './build-static.ts';

type BuildOptions = Parameters<typeof buildStaticStandalone>[0] &
  Parameters<typeof buildIndexStandalone>[0];

type StandaloneOptions = Partial<BuildOptions> & {
  mode?: 'dev' | 'static' | 'index';
  frameworkPresets?: PresetConfig[];
};

async function build(options: StandaloneOptions = {}, frameworkOptions: StandaloneOptions = {}) {
  const { mode = 'dev' } = options;

  const { default: packageJson } = await import('@aussieljk/forkbook/package.json', {
    with: { type: 'json' },
  });

  const commonOptions = {
    ...options,
    ...frameworkOptions,
    frameworkPresets: [
      ...(options.frameworkPresets || []),
      ...(frameworkOptions.frameworkPresets || []),
    ],
    packageJson,
  } as BuildOptions;

  if (mode === 'dev') {
    return buildDevStandalone(commonOptions);
  }

  if (mode === 'static') {
    return buildStaticStandalone(commonOptions);
  }

  if (mode === 'index') {
    return buildIndexStandalone(commonOptions);
  }

  throw new Error(`'mode' parameter should be either 'dev', 'static', or 'index'`);
}

export default build;
