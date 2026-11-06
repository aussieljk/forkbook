import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./addon-comments/manager'],
        entryPoint: './src/addon-comments/manager.tsx',
        dts: false,
      },
      {
        exportEntries: ['./addon-comments/preview'],
        entryPoint: './src/addon-comments/preview.ts',
        dts: false,
      },
    ],
    node: [
      {
        exportEntries: ['./addon-comments/preset'],
        entryPoint: './src/addon-comments/preset.ts',
        dts: false,
      },
    ],
  },
};

export default config;
