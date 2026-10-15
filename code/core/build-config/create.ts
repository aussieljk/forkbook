import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    node: [
      {
        exportEntries: ['./internal/create'],
        entryPoint: './src/create/index.ts',
        dts: false,
      },
      {
        entryPoint: './src/create/bin/index.ts',
        dts: false,
      },
    ],
  },
};

export default config;
