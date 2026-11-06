import type { PresetProperty } from '@aussieljk/forkbook/internal/types';

import type { StorybookConfigVite } from '@aussieljk/forkbook/builder-vite';

import { tailwindRefreshPlugin } from './tailwind-refresh/plugin.ts';

export const core: PresetProperty<'core'> = {
  builder: import.meta.resolve('@aussieljk/forkbook/builder-vite'),
  renderer: import.meta.resolve('@aussieljk/forkbook/react/preset'),
};

export const viteFinal: StorybookConfigVite['viteFinal'] = async (config) => ({
  ...config,
  plugins: [...(config.plugins ?? []), tailwindRefreshPlugin()],
});
