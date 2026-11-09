import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

// builder-next: the preview builder for `forkbook dev` when `next dev` serves the preview.
const config: BuildEntries = {
  entries: {
    node: [
      {
        exportEntries: ['./builder-next'],
        entryPoint: './src/builder-next/index.ts',
      },
    ],
  },
};

export default config;
