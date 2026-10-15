import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./react'],
        entryPoint: './src/react/index.ts',
      },
      {
        exportEntries: ['./react/preview'],
        entryPoint: './src/react/preview.tsx',
      },
      {
        exportEntries: ['./react/entry-preview'],
        entryPoint: './src/react/entry-preview.tsx',
        dts: false,
      },
      {
        exportEntries: ['./react/entry-preview-argtypes'],
        entryPoint: './src/react/entry-preview-argtypes.ts',
        dts: false,
      },
      {
        exportEntries: ['./react/entry-preview-docs'],
        entryPoint: './src/react/entry-preview-docs.ts',
        dts: false,
      },
      {
        exportEntries: ['./react/entry-preview-rsc'],
        entryPoint: './src/react/entry-preview-rsc.tsx',
        dts: false,
      },
    ],
    node: [
      {
        exportEntries: ['./react/preset'],
        entryPoint: './src/react/preset.ts',
        dts: false,
      },
      {
        // Worker-target docgen module imported by core's docgen worker. Exposed as an internal
        // export so the preset resolves it via import.meta.resolve (package map) instead of a
        // hard-coded dist path.
        exportEntries: ['./react/internal/docgen-worker'],
        entryPoint: './src/react/docgen/docgen-worker.ts',
        dts: false,
      },
    ],
  },
};

export default config;
