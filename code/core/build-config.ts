import path from 'node:path';

import { x as exec } from 'tinyexec';

import type { BuildEntries } from '../../scripts/build/utils/entry-utils.ts';
import react from './build-config/react.ts';
import reactVite from './build-config/react-vite.ts';
import nextjsVite from './build-config/nextjs-vite.ts';
import nextjsVitePlugin from './build-config/nextjs-vite-plugin.ts';
import builderVite from './build-config/builder-vite.ts';
import addonA11y from './build-config/addon-a11y.ts';
import addonDocs from './build-config/addon-docs.ts';
import addonLinks from './build-config/addon-links.ts';
import addonMcp from './build-config/addon-mcp.ts';
import addonPseudoStates from './build-config/addon-pseudo-states.ts';
import addonThemes from './build-config/addon-themes.ts';
import addonVitest from './build-config/addon-vitest.ts';
import mcp from './build-config/mcp.ts';
import create from './build-config/create.ts';
import cliCommands from './build-config/cli-commands.ts';
import reactNative from './build-config/react-native.ts';

const coreConfig: BuildEntries = {
  prebuild: async (cwd) => {
    await exec('jiti', [path.join(import.meta.dirname, 'scripts', 'generate-source-files.ts')], {
      nodeOptions: {
        cwd,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          FORCE_COLOR: '1',
        },
        stdio: 'inherit',
      },
      throwOnError: true,
    });
  },
  entries: {
    node: [
      {
        exportEntries: ['./internal/node-logger'],
        entryPoint: './src/node-logger/index.ts',
      },
      {
        exportEntries: ['./internal/server-errors'],
        entryPoint: './src/server-errors.ts',
      },
      {
        exportEntries: ['./internal/core-server'],
        entryPoint: './src/core-server/index.ts',
      },
      {
        entryPoint: './src/core-server/presets/common-preset.ts',
        dts: false,
      },
      {
        exportEntries: ['./internal/oxc-parser'],
        entryPoint: './src/oxc-parser/index.ts',
      },
      {
        entryPoint: './src/oxc-parser/worker.ts',
        dts: false,
      },
      {
        // Long-lived worker that runs docgen extraction off the main thread. Exposed as an internal
        // export so docgen-worker-client.ts resolves it via the package map (import.meta.resolve)
        // rather than a hard-coded dist path, keeping strict package managers (pnpm) happy.
        exportEntries: ['./internal/docgen-worker'],
        entryPoint: './src/shared/open-service/services/docgen/worker/docgen-worker.ts',
        dts: false,
      },
      {
        entryPoint: './src/core-server/presets/common-override-preset.ts',
        exportEntries: ['./internal/core-server/presets/common-override-preset'],
        dts: false,
      },
      {
        exportEntries: ['./internal/telemetry'],
        entryPoint: './src/telemetry/index.ts',
      },
      {
        exportEntries: ['./internal/csf-tools'],
        entryPoint: './src/csf-tools/index.ts',
      },
      {
        exportEntries: ['./internal/babel'],
        entryPoint: './src/babel/index.ts',
      },
      {
        exportEntries: ['./internal/bin/dispatcher'],
        entryPoint: './src/bin/dispatcher.ts',
        dts: false,
      },
      {
        entryPoint: './src/bin/core.ts',
        dts: false,
      },
      {
        exportEntries: ['./internal/bin/loader'],
        entryPoint: './src/bin/loader.ts',
        dts: false,
      },
      {
        exportEntries: ['./internal/common'],
        entryPoint: './src/common/index.ts',
      },
      {
        entryPoint: './src/cli/index.ts',
        exportEntries: ['./internal/cli'],
      },
      {
        exportEntries: ['./internal/mocking-utils'],
        entryPoint: './src/mocking-utils/index.ts',
      },
      {
        exportEntries: ['./internal/tools'],
        entryPoint: './src/cli/tools/sdk/index.ts',
      },
      {
        exportEntries: ['./internal/tools/child-host'],
        entryPoint: './src/cli/tools/sdk/child-host.ts',
      },
    ],
    browser: [
      {
        exportEntries: ['./internal/client-logger'],
        entryPoint: './src/client-logger/index.ts',
      },
      {
        exportEntries: ['./internal/instrumenter'],
        entryPoint: './src/instrumenter/index.ts',
      },
      {
        exportEntries: ['./test'],
        entryPoint: './src/test/index.ts',
      },
      {
        exportEntries: ['./preview-api', './internal/preview-api'],
        entryPoint: './src/preview-api/index.ts',
      },
      {
        exportEntries: ['./highlight'],
        entryPoint: './src/highlight/index.ts',
      },
      {
        exportEntries: ['./actions'],
        entryPoint: './src/actions/index.ts',
      },
      {
        exportEntries: ['./actions/decorator'],
        entryPoint: './src/actions/decorator.ts',
      },
      {
        exportEntries: ['./backgrounds'],
        entryPoint: './src/backgrounds/index.ts',
      },
      {
        exportEntries: ['./viewport'],
        entryPoint: './src/viewport/index.ts',
      },
      {
        exportEntries: ['./internal/preview/globals'],
        entryPoint: './src/preview/globals.ts',
      },
      {
        exportEntries: ['./internal/csf'],
        entryPoint: './src/csf/index.ts',
      },
      {
        exportEntries: ['./internal/csf/csf-utils'],
        entryPoint: './src/csf/csf-utils.ts',
      },
      {
        exportEntries: ['./internal/manager-errors'],
        entryPoint: './src/manager-errors.ts',
      },
      {
        exportEntries: ['./internal/preview-errors'],
        entryPoint: './src/preview-errors.ts',
      },
      {
        exportEntries: ['./internal/manager/globals'],
        entryPoint: './src/manager/globals.ts',
      },
      {
        exportEntries: ['./internal/manager/manager-stores'],
        entryPoint: './src/manager/manager-stores.ts',
      },
      {
        entryPoint: './src/core-server/presets/common-manager.ts',
        dts: false,
      },
      {
        exportEntries: ['./theming'],
        entryPoint: './src/theming/index.ts',
      },
      {
        exportEntries: ['./theming/create'],
        entryPoint: './src/theming/create.ts',
      },
      {
        exportEntries: ['./internal/components'],
        entryPoint: './src/components/index.ts',
      },
      {
        exportEntries: ['./manager-api'],
        entryPoint: './src/manager-api/index.ts',
      },
      {
        exportEntries: ['./internal/router'],
        entryPoint: './src/router/index.ts',
      },
      {
        exportEntries: ['./internal/docs-tools'],
        entryPoint: './src/docs-tools/index.ts',
      },
      {
        exportEntries: ['./internal/core-events'],
        entryPoint: './src/core-events/index.ts',
      },
      {
        exportEntries: ['./internal/channels'],
        entryPoint: './src/channels/index.ts',
      },
      {
        exportEntries: ['./internal/types'],
        entryPoint: './src/types/index.ts',
      },
      {
        exportEntries: ['./open-service'],
        entryPoint: './src/shared/open-service/index.ts',
      },
      {
        // Dependency-light docs toolset surface bundled into `@aussieljk/forkbook/mcp`'s dist (core is a
        // dev dependency there), replacing that package's own manifest-formatter copies. Portable:
        // its d.ts is one flat self-contained file so that consumer can inline it through standard
        // resolution; guarded by `portable-dist.test.ts` next to the entry source.
        exportEntries: ['./internal/toolsets-docs'],
        entryPoint: './src/shared/open-service/toolsets/docs/public.ts',
        portable: { external: ['valibot'] },
      },
      {
        // Pure skill-content builders shared by the skills CLI and addon-mcp so both consumers render
        // the same instruction documents. Not portable: consumers resolve core normally.
        exportEntries: ['./internal/skills'],
        entryPoint: './src/cli/skills/content/index.ts',
      },
    ],
    runtime: [
      {
        exportEntries: ['./internal/preview/runtime'],
        entryPoint: './src/preview/runtime.ts',
        dts: false,
        chunkedRuntime: true,
      },
      {
        exportEntries: ['./internal/manager/globals-runtime'],
        entryPoint: './src/manager/globals-runtime.ts',
        dts: false,
        chunkedRuntime: true,
      },
      /**
       * It is required to be a runtime entry point, because it is used to inject the mocker runtime
       * into the preview iframe in builder-vite. To guarantee that the mocker
       * runtime is transpiled correctly, code splitting needs to be disabled for this entry point.
       */
      {
        exportEntries: ['./internal/mocking-utils/mocker-runtime'],
        entryPoint: './src/mocking-utils/mocker-runtime.js',
        dts: false,
      },
    ],
    globalizedRuntime: [
      {
        entryPoint: './src/manager/runtime.tsx',
        dts: false,
      },
    ],
  },
};

// The package is one npm package. Each area (renderer, framework, addon, CLI) lists its own
// entries in build-config/<area>.ts, and they all build together here.
const areas: BuildEntries[] = [
  react,
  reactVite,
  nextjsVite,
  nextjsVitePlugin,
  builderVite,
  addonA11y,
  addonDocs,
  addonLinks,
  addonMcp,
  addonPseudoStates,
  addonThemes,
  addonVitest,
  mcp,
  create,
  cliCommands,
  reactNative,
];

const config: BuildEntries = {
  ...coreConfig,
  entries: Object.fromEntries(
    (['node', 'browser', 'runtime', 'globalizedRuntime'] as const).map((platform) => [
      platform,
      [coreConfig, ...areas].flatMap((area) => area.entries[platform] ?? []),
    ])
  ),
  extraOutputs: Object.assign(
    {},
    coreConfig.extraOutputs,
    ...areas.map((area) => area.extraOutputs)
  ),
};

export default config;
