import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineMain } from 'storybook/react-vite/node';
import type { Options } from 'storybook/internal/types';

import react from '@vitejs/plugin-react';
import type { InlineConfig } from 'vite';

import { BROWSER_TARGETS } from '../core/src/shared/constants/environments-support.ts';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

const componentsPath = join(currentDirPath, '../core/src/components/index.ts');
const managerApiPath = join(currentDirPath, '../core/src/manager-api/index.mock.ts');
const previewApiPath = join(currentDirPath, '../core/src/preview-api/index.ts');
const themingCreatePath = join(currentDirPath, '../core/src/theming/create.ts');
const themingPath = join(currentDirPath, '../core/src/theming/index.ts');

const config = defineMain({
  stories: [
    {
      directory: '../core/template/stories',
      titlePrefix: 'core',
    },
    {
      directory: '../core/src/manager',
      titlePrefix: 'manager',
    },
    {
      directory: '../core/src/preview-api',
      titlePrefix: 'preview',
    },
    {
      directory: '../core/src/preview',
      titlePrefix: 'preview',
    },
    {
      directory: '../core/src/shared',
      titlePrefix: 'core/shared',
    },
    {
      directory: '../core/src/components/brand',
      titlePrefix: 'brand',
    },
    {
      directory: '../core/src/components/components',
      titlePrefix: 'components',
    },
    {
      directory: '../core/src/component-testing/components',
      titlePrefix: 'component-testing',
    },
    {
      directory: '../core/src/controls/components',
      titlePrefix: 'controls',
    },
    {
      directory: '../core/src/highlight',
      titlePrefix: 'highlight',
    },
    {
      directory: '../core/src/actions/containers',
      titlePrefix: 'actions',
    },
    {
      directory: '../core/src/addon-a11y',
      titlePrefix: 'addons/accessibility',
    },
    {
      directory: '../core/template/addon-a11y/stories',
      titlePrefix: 'addons/accessibility',
    },
    {
      directory: '../core/template/addon-docs/stories',
      titlePrefix: 'addons/docs',
    },
    {
      directory: '../core/src/addon-docs',
      titlePrefix: 'addons/docs',
    },
    {
      directory: '../core/template/addon-links/stories',
      titlePrefix: 'addons/links',
    },
    {
      directory: '../core/template/addon-themes/stories',
      titlePrefix: 'addons/themes',
    },
    {
      directory: '../core/src/addon-pseudo-states',
      titlePrefix: 'addons/pseudo-states',
    },
    {
      directory: '../core/src/addon-vitest/components',
      titlePrefix: 'addons/vitest',
    },
    {
      directory: '../core/template/addon-vitest/stories',
      titlePrefix: 'addons/vitest',
    },
    {
      directory: '../core/src/addon-vitest',
      titlePrefix: 'addons/vitest',
      files: 'stories.tsx',
    },
    {
      directory: '../core/src/react/__test__',
      titlePrefix: 'renderer/react',
      files: '@(ReactDomClient|RenderToCanvas).stories.tsx',
    },
  ],
  addons: [
    'storybook/addon-themes',
    'storybook/addon-docs',
    'storybook/addon-vitest',
    'storybook/addon-a11y',
    'storybook/addon-mcp',
    'storybook/addon-pseudo-states',
    './services-preset.ts',
  ],
  previewAnnotations: [
    './core/template/stories/preview.ts',
    './core/template/react/components/index.js',
  ],
  build: {
    test: {
      // we have stories for the blocks here, we can't exclude them
      disableBlocks: false,
      // some stories in blocks (ArgTypes, Controls) depends on argTypes inference
      disableDocgen: false,
    },
  },
  framework: {
    name: 'storybook/react-vite',
    options: {},
  },
  refs: {
    icons: {
      title: 'Icons',
      url: 'https://main--64b56e737c0aeefed9d5e675.chromatic.com',
      expanded: false,
    },
  },
  core: {
    disableTelemetry: true,
  },
  features: {
    developmentModeForBuild: true,
    experimentalTestSyntax: true,
    experimentalSearchDocsHeadings: true,
  },
  viteFinal: async (viteConfig: InlineConfig, { configType }: Options) => {
    const { mergeConfig } = await import('vite');

    return mergeConfig(viteConfig, {
      resolve: {
        alias:
          configType === 'DEVELOPMENT'
            ? {
                'storybook/internal/components': componentsPath,
                'storybook/manager-api': managerApiPath,
                'storybook/preview-api': previewApiPath,
                'storybook/theming/create': themingCreatePath,
                'storybook/theming': themingPath,
              }
            : {
                // The components dist bundle inlines Base UI; resolving to source keeps the
                // preview on a single Base UI copy so focus traps can nest across modules.
                'storybook/internal/components': componentsPath,
                'storybook/manager-api': managerApiPath,
                'storybook/preview-api': previewApiPath,
              },
      },
      plugins: [react()],
      build: {
        // disable sourcemaps in CI to not run out of memory
        sourcemap: process.env.CI !== 'true',
        target: BROWSER_TARGETS,
      },
      server: {
        watch: {
          // Something odd happens with tsconfig and nx which causes Storybook to keep reloading, so we ignore them
          ignored: [
            '**/.nx/cache/**',
            '**/tsconfig.json',
            // Internal e2e writes traces under code/playwright-results while the dev server is running.
            '**/playwright-results/**',
            '**/playwright-report/**',
          ],
        },
      },
    } satisfies typeof viteConfig);
  },
});

export default config;
