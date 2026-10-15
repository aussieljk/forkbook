import type { BuildEntries, BuildEntry } from '../../../scripts/build/utils/entry-utils.ts';

// Mock modules are resolved/aliased at runtime; skip d.ts emission so the
// type bundler does not walk storybook/test → vitest declaration graphs.
const mockEntries: BuildEntry[] = [
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/cache',
      './internal/nextjs-vite-plugin/node/mocks/cache',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-mocks/alias/cache/index.ts',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/navigation',
      './internal/nextjs-vite-plugin/node/mocks/navigation',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-mocks/alias/navigation/index.ts',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/headers',
      './internal/nextjs-vite-plugin/node/mocks/headers',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-mocks/alias/headers/index.ts',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/router',
      './internal/nextjs-vite-plugin/node/mocks/router',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-mocks/alias/router/index.ts',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/link',
      './internal/nextjs-vite-plugin/node/mocks/link',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-mocks/alias/link/index.tsx',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/server-only',
      './internal/nextjs-vite-plugin/node/mocks/server-only',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-mocks/alias/rsc/server-only.ts',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/dynamic',
      './internal/nextjs-vite-plugin/node/mocks/dynamic',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-mocks/alias/dynamic/index.tsx',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/safe-stable-stringify',
      './internal/nextjs-vite-plugin/node/mocks/safe-stable-stringify',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-mocks/alias/safe-stable-stringify/index.ts',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/draft-mode.compat',
      './internal/nextjs-vite-plugin/node/mocks/draft-mode.compat',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-mocks/compatibility/draft-mode.compat.ts',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/image',
      './internal/nextjs-vite-plugin/node/mocks/image',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-image/alias/next-image.tsx',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/legacy-image',
      './internal/nextjs-vite-plugin/node/mocks/legacy-image',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-image/alias/next-legacy-image.tsx',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/image-default-loader',
      './internal/nextjs-vite-plugin/node/mocks/image-default-loader',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-image/alias/image-default-loader.tsx',
    dts: false,
  },
  {
    exportEntries: [
      './internal/nextjs-vite-plugin/browser/mocks/image-context',
      './internal/nextjs-vite-plugin/node/mocks/image-context',
    ],
    entryPoint: './src/nextjs-vite-plugin/plugins/next-image/alias/image-context.tsx',
    dts: false,
  },
];

const config: BuildEntries = {
  entries: {
    // Mock modules are loaded by Vite/Vitest via package exports; browser platform
    // matches how storybook/nextjs-vite ships its own export-mocks.
    browser: [...mockEntries],
    node: [
      {
        exportEntries: ['./internal/nextjs-vite-plugin'],
        entryPoint: './src/nextjs-vite-plugin/index.ts',
      },
      // Resolved relatively from the compiled plugin for Vitest setupFiles.
      {
        entryPoint: './src/nextjs-vite-plugin/mocks/storybook.global.ts',
        dts: false,
      },
    ],
  },
};

export default config;
