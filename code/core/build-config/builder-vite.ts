import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    node: [
      {
        exportEntries: ['./builder-vite'],
        entryPoint: './src/builder-vite/index.ts',
      },
      {
        exportEntries: ['./builder-vite/preset'],
        entryPoint: './src/builder-vite/preset.ts',
        dts: false,
      },
    ],
  },
  extraOutputs: {
    './builder-vite/input/iframe.html': './assets/builder-vite/iframe.html',
  },
};

export default config;
