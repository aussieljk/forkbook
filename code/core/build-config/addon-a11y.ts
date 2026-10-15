import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./addon-a11y'],
        entryPoint: './src/addon-a11y/index.ts',
      },
      {
        exportEntries: ['./addon-a11y/preview'],
        entryPoint: './src/addon-a11y/preview.tsx',
      },
      {
        exportEntries: ['./addon-a11y/manager'],
        entryPoint: './src/addon-a11y/manager.tsx',
        dts: false,
      },
    ],
    node: [
      {
        exportEntries: ['./addon-a11y/preset'],
        entryPoint: './src/addon-a11y/preset.ts',
        dts: false,
      },
    ],
  },
};

export default config;
