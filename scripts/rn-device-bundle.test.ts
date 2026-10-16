import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import * as esbuild from 'esbuild';
import { describe, expect, it } from 'vitest';

/**
 * Loads the built React Native entries (code/core/dist) as a device does: with no `document`.
 * Metro resolves each package import, so here each third-party package import is a stub. The code
 * that the build put inside dist, and the other Forkbook entries it imports, run for real. A
 * browser-only build of a package in dist (for example the browser build of @emotion/cache)
 * touches `document` when it loads, and the test fails.
 */
const CORE = join(import.meta.dirname, '../code/core');
const DIST = join(CORE, 'dist');
const { name: PACKAGE, exports: EXPORTS } = JSON.parse(
  readFileSync(join(CORE, 'package.json'), 'utf8')
) as { name: string; exports: Record<string, { default?: string } | string> };

/** The dist file of a Forkbook import, as Metro finds it through the `default` export condition. */
function forkbookFile(path: string) {
  const entry = EXPORTS[`.${path.slice(PACKAGE.length)}`];
  const file = typeof entry === 'string' ? entry : entry?.default;
  return file ? join(CORE, file) : undefined;
}

const ENTRIES = [
  'react-native/index.js',
  'react-native/preview.js',
  'react-native/stub.js',
  'react-native-ui/index.js',
  'react-native-theming/index.js',
  'react-native-ui-common/index.js',
  'addon-ondevice-controls/index.js',
  'addon-ondevice-controls/register.js',
  'addon-ondevice-actions/index.js',
  'addon-ondevice-actions/register.js',
];

// A value that each property access, call and `new` gives again, so any package API works.
const STUB = `
const target = function () {};
const stub = new Proxy(target, {
  get: (_, key) => {
    if (key === Symbol.toPrimitive) return () => '';
    if (key === Symbol.iterator) return function* () {};
    if (key === 'then') return undefined;
    return stub;
  },
  apply: () => stub,
  construct: () => stub,
  // esbuild copies a package's exports into a new object with this prototype.
  getPrototypeOf: () => stub,
});
module.exports = stub;
`;

async function bundle(entry: string) {
  const result = await esbuild.build({
    entryPoints: [join(DIST, entry)],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'neutral',
    logLevel: 'silent',
    plugins: [
      {
        name: 'stub-packages',
        setup(build) {
          // Forkbook's own entries run for real: the device loads them from dist too.
          build.onResolve({ filter: /^@aussieljk\/forkbook(\/|$)/ }, (args) => {
            const file = forkbookFile(args.path);
            return file ? { path: file } : { path: args.path, namespace: 'stub' };
          });
          build.onResolve({ filter: /^[^./]/ }, (args) => ({ path: args.path, namespace: 'stub' }));
          build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents: STUB,
            loader: 'js',
          }));
        },
      },
    ],
  });
  return result.outputFiles[0].text;
}

describe.skipIf(!existsSync(join(DIST, 'react-native/index.js')))(
  'React Native entries in dist load with no DOM',
  () => {
    it.each(ENTRIES)('%s', async (entry) => {
      const code = await bundle(entry);
      const module = { exports: {} };
      const context = {
        module,
        exports: module.exports,
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        queueMicrotask,
        process: { env: { NODE_ENV: 'development' } },
        // Like React Native 0.88: `window` is the global object and the DOM node classes exist,
        // but there is no `document`.
        navigator: { product: 'ReactNative' },
        HTMLElement: class HTMLElement {},
      };
      Object.assign(context, { globalThis: context, window: context, global: context });
      expect(() => runInNewContext(code, context, { filename: entry })).not.toThrow();
    });
  }
);
