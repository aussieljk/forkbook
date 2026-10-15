import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./addon-vitest'],
        entryPoint: './src/addon-vitest/index.ts',
      },
      {
        exportEntries: ['./addon-vitest/manager'],
        entryPoint: './src/addon-vitest/manager.tsx',
        dts: false,
      },
      {
        exportEntries: ['./addon-vitest/internal/setup-file'],
        entryPoint: './src/addon-vitest/vitest-plugin/setup-file.ts',
        dts: false,
      },
      {
        exportEntries: ['./addon-vitest/internal/setup-file.browser.4'],
        entryPoint: './src/addon-vitest/vitest-plugin/setup-file.browser.4.ts',
        dts: false,
      },
      {
        exportEntries: ['./addon-vitest/internal/setup-file-with-project-annotations'],
        entryPoint: './src/addon-vitest/vitest-plugin/setup-file-with-project-annotations.ts',
        external: ['virtual:/@storybook/builder-vite/project-annotations.js'],
        dts: false,
      },
      {
        exportEntries: ['./addon-vitest/internal/test-utils'],
        entryPoint: './src/addon-vitest/vitest-plugin/test-utils.ts',
        dts: false,
      },
    ],
    node: [
      {
        exportEntries: ['./addon-vitest/constants'],
        entryPoint: './src/addon-vitest/constants.ts',
      },
      {
        exportEntries: ['./addon-vitest/preset'],
        entryPoint: './src/addon-vitest/preset.ts',
        dts: false,
      },
      {
        exportEntries: ['./addon-vitest/internal/global-setup'],
        entryPoint: './src/addon-vitest/vitest-plugin/global-setup.ts',
        dts: false,
      },
      {
        exportEntries: ['./addon-vitest/vitest'],
        entryPoint: './src/addon-vitest/node/vitest.ts',
        dts: false,
      },
      {
        exportEntries: ['./addon-vitest/postinstall'],
        entryPoint: './src/addon-vitest/postinstall.ts',
        dts: false,
      },
      {
        exportEntries: ['./addon-vitest/vitest-plugin'],
        entryPoint: './src/addon-vitest/vitest-plugin/index.ts',
      },
      {
        exportEntries: ['./addon-vitest/internal/coverage-reporter'],
        entryPoint: './src/addon-vitest/node/coverage-reporter.ts',
        dts: false,
      },
    ],
  },
};

export default config;
