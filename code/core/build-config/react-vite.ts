import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./react-vite'],
        entryPoint: './src/react-vite/index.ts',
      },
    ],
    node: [
      {
        exportEntries: ['./react-vite/preset'],
        entryPoint: './src/react-vite/preset.ts',
      },
      {
        exportEntries: ['./react-vite/node'],
        entryPoint: './src/react-vite/node/index.ts',
      },
    ],
  },
};

export default config;
