import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';

import { vitestCommonConfig } from '../../../vitest.shared.ts';

const stub = (name: string) => new URL(`./test-stubs/${name}`, import.meta.url).pathname;

// The React Native renderer runs on the device. In Node, the native modules are small stand-ins.
export default mergeConfig(
  vitestCommonConfig,
  defineConfig({
    resolve: {
      alias: [
        { find: /^react-native$/, replacement: stub('react-native.tsx') },
        { find: /^react-native-safe-area-context$/, replacement: stub('empty.tsx') },
        { find: /^@aussieljk\/forkbook\/react-native-ui$/, replacement: stub('empty.tsx') },
        // Its ESM build, so the react-native alias applies. Its CommonJS build requires the real
        // react-native, which Node cannot parse (Flow).
        {
          find: /^@emotion\/native$/,
          replacement: join(
            dirname(fileURLToPath(import.meta.resolve('@emotion/native/package.json'))),
            'dist/emotion-native.esm.js'
          ),
        },
      ],
    },
    test: {
      setupFiles: [stub('setup.ts')],
      server: {
        deps: {
          // So the aliases apply inside the bundled dist files and @emotion/native.
          inline: [/@aussieljk\/forkbook/, /@emotion\/native/],
        },
      },
    },
  })
);
