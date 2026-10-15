import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';

import { textAssetLoaderPlugins, vitestCommonConfig } from '../vitest.shared.ts';

const require = createRequire(import.meta.url);
const polkaUrlEsm = join(dirname(require.resolve('@polka/url/package.json')), 'build.mjs');

// Areas with their own Vitest project (src/<area>/vitest.config.ts) run there, not here.
const src = join(import.meta.dirname, 'src');
const areasWithOwnProject = readdirSync(src).filter((area) =>
  existsSync(join(src, area, 'vitest.config.ts'))
);

export default mergeConfig(
  vitestCommonConfig,
  defineConfig({
    plugins: [...textAssetLoaderPlugins],
    // oxc-parser / oxc-resolver ship `browser` entry points that import WASM bindings which
    // are not installed in this monorepo. Force Vite/Vitest to resolve them via their Node
    // entry points (index.js) during tests and benchmarks.
    resolve: {
      conditions: ['node'],
      mainFields: ['main'],
      // Nested @polka/url@0.5.0 is CJS and breaks polka's named `parse` import.
      // Absolute path: `@polka/url/build.mjs` is not in the package exports map.
      alias: {
        '@polka/url': polkaUrlEsm,
      },
    },
    ssr: {
      external: ['oxc-parser', 'oxc-resolver'],
    },
    test: {
      name: 'core',
      exclude: [...configDefaults.exclude, ...areasWithOwnProject.map((area) => `src/${area}/**`)],
      typecheck: {
        enabled: true,
      },
      server: {
        deps: {
          // Inline so the `@polka/url` alias applies to polka's own import graph.
          inline: ['polka', '@polka/url'],
          external: ['oxc-parser', 'oxc-resolver'],
        },
      },
      benchmark: {
        include: ['**/*.bench.ts'],
      },
    },
  })
);
