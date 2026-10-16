import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./nextjs-vite'],
        entryPoint: './src/nextjs-vite/index.ts',
      },
      {
        exportEntries: ['./nextjs-vite/preview'],
        entryPoint: './src/nextjs-vite/preview.tsx',
      },
      {
        exportEntries: ['./nextjs-vite/config/preview'],
        entryPoint: './src/nextjs-vite/config/preview.ts',
        dts: false,
      },
      {
        exportEntries: ['./nextjs-vite/cache.mock'],
        entryPoint: './src/nextjs-vite/export-mocks/cache/index.ts',
      },
      {
        exportEntries: ['./nextjs-vite/headers.mock'],
        entryPoint: './src/nextjs-vite/export-mocks/headers/index.ts',
      },
      {
        exportEntries: ['./nextjs-vite/navigation.mock'],
        entryPoint: './src/nextjs-vite/export-mocks/navigation/index.ts',
      },
      {
        exportEntries: ['./nextjs-vite/link.mock'],
        entryPoint: './src/nextjs-vite/export-mocks/link/index.tsx',
      },
      {
        exportEntries: ['./nextjs-vite/router.mock'],
        entryPoint: './src/nextjs-vite/export-mocks/router/index.ts',
      },
    ],
    node: [
      {
        exportEntries: ['./nextjs-vite/node'],
        entryPoint: './src/nextjs-vite/node/index.ts',
      },
      {
        exportEntries: ['./nextjs-vite/vite-plugin'],
        entryPoint: './src/nextjs-vite/vite-plugin/index.ts',
      },
      {
        exportEntries: ['./nextjs-vite/preset'],
        entryPoint: './src/nextjs-vite/preset.ts',
        dts: false,
        // postcss-load-config imports a config file natively first. jiti is only a fallback,
        // and the user installs it when they need it.
        external: ['jiti'],
      },
    ],
  },
};

export default config;
