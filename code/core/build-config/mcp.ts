import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    node: [
      {
        exportEntries: ['./mcp'],
        entryPoint: './src/mcp/index.ts',
      },
    ],
  },
};

export default config;
