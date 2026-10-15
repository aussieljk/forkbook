import { defaultExclude, defineProject } from 'vitest/config';

import { storybookTest } from '@aussieljk/forkbook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';
import Inspect from 'vite-plugin-inspect';

const extraPlugins: any[] = [];
if (process.env.INSPECT === 'true') {
  // this plugin assists in inspecting the Forkbook Vitest plugin's transformation and sourcemaps
  extraPlugins.push(
    Inspect({
      outputDir: '.vite-inspect',
      build: true,
      open: true,
      include: ['**/*.stories.*'],
    })
  );
}

export default defineProject({
  plugins: [
    storybookTest({
      configDir: import.meta.dirname + '/.forkbook',
      tags: {
        include: ['vitest'],
      },
      // Pinned for the InitialGlobals story, which asserts this reaches the run (see
      // core/src/addon-vitest/components/InitialGlobals.stories.tsx).
      initialGlobals: { initialGlobalsWork: true },
    }),
    ...extraPlugins,
  ],
  test: {
    name: 'storybook-ui',
    // Playwright occasionally misses the vitest-iframe frame within 1s under full-suite load.
    retry: process.env.CI ? 2 : 1,
    exclude: [
      ...defaultExclude,
      'node_modules/**',
      '**/__mockdata__/**',
      '**/*.bench.ts', // benchmark files are Node-only; never run in the browser project
      '**/Zoom.stories.tsx', // expected to fail in Vitest because of fetching /iframe.html to cause ECONNREFUSED
      './core/src/addon-docs/blocks/**', // won't work because of https://github.com/storybookjs/storybook/issues/29783
    ],
    // TODO: bring this back once portable stories support @aussieljk/forkbook/preview-api hooks
    testNamePattern: /^(?!.*(UseState)).*$/,
    browser: {
      enabled: true,
      provider: playwright({}),
      instances: [
        {
          browser: 'chromium',
        },
      ],
      headless: true,
      screenshotFailures: false,
    },
    setupFiles: ['./.forkbook/storybook.setup.ts'],
    environment: 'happy-dom',
  },
});
