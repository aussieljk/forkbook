import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./addon-links'],
        entryPoint: './src/addon-links/index.ts',
      },
      {
        exportEntries: ['./addon-links/react'],
        entryPoint: './src/addon-links/react/index.ts',
      },
      {
        exportEntries: ['./addon-links/preview'],
        entryPoint: './src/addon-links/preview.ts',
      },
      {
        exportEntries: ['./addon-links/manager'],
        entryPoint: './src/addon-links/manager.ts',
        dts: false,
      },
    ],
  },
};

export default config;
