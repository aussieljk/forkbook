import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./addon-pseudo-states'],
        entryPoint: './src/addon-pseudo-states/index.ts',
      },
      {
        exportEntries: ['./addon-pseudo-states/manager'],
        entryPoint: './src/addon-pseudo-states/manager.ts',
        dts: false,
      },
      {
        exportEntries: ['./addon-pseudo-states/preview'],
        entryPoint: './src/addon-pseudo-states/preview.ts',
      },
    ],
  },
};

export default config;
