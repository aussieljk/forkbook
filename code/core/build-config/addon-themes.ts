import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./addon-themes'],
        entryPoint: './src/addon-themes/index.ts',
      },
      {
        exportEntries: ['./addon-themes/manager'],
        entryPoint: './src/addon-themes/manager.tsx',
        dts: false,
      },
      {
        exportEntries: ['./addon-themes/preview'],
        entryPoint: './src/addon-themes/preview.ts',
      },
    ],
    node: [
      {
        exportEntries: ['./addon-themes/postinstall'],
        entryPoint: './src/addon-themes/postinstall.ts',
        dts: false,
      },
    ],
  },
};

export default config;
