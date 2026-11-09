import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

// `withForkbook` for next.config. Node only, with no imports outside the Node built-ins.
const config: BuildEntries = {
  entries: {
    node: [
      {
        exportEntries: ['./next'],
        entryPoint: './src/next/index.ts',
      },
    ],
  },
};

export default config;
