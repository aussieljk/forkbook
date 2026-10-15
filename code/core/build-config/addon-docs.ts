import type { BuildEntries } from '../../../scripts/build/utils/entry-utils';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./addon-docs'],
        entryPoint: './src/addon-docs/index.ts',
      },
      {
        exportEntries: ['./addon-docs/preview'],
        entryPoint: './src/addon-docs/preview.ts',
      },
      {
        exportEntries: ['./addon-docs/manager'],
        entryPoint: './src/addon-docs/manager.tsx',
        dts: false,
      },
      {
        exportEntries: ['./addon-docs/blocks'],
        entryPoint: './src/addon-docs/blocks.ts',
      },
      {
        exportEntries: ['./addon-docs/mdx-react-shim'],
        entryPoint: './src/addon-docs/mdx-react-shim.ts',
      },
    ],
    node: [
      {
        exportEntries: ['./addon-docs/preset'],
        entryPoint: './src/addon-docs/preset.ts',
        dts: false,
      },
    ],
  },
};

export default config;
