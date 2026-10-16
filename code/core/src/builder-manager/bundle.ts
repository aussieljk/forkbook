import { dirname, join, relative } from 'pathe';
import type { Plugin } from 'rolldown';

import { globalsModuleInfoMap } from '../manager/globals/globals-module-info.ts';
import { BROWSER_TARGETS } from '../shared/constants/environments-support.ts';
import type { Compilation, ManagerBuildConfig } from './types.ts';

const MEDIA_EXTENSIONS = [
  '.png',
  '.gif',
  '.jpg',
  '.jpeg',
  '.svg',
  '.webp',
  '.webm',
  '.mp3',
  '.woff2',
  '.woff',
  '.eot',
  '.ttf',
];

const GLOBAL_PREFIX = '\0forkbook-global:';

/** Replaces the imports of the packages that the manager gives as globals with those globals. */
function globalExternals(): Plugin {
  return {
    name: 'forkbook-global-externals',
    resolveId(id) {
      return id in globalsModuleInfoMap ? `${GLOBAL_PREFIX}${id}` : null;
    },
    load(id) {
      if (!id.startsWith(GLOBAL_PREFIX)) {
        return null;
      }
      const name = id.slice(GLOBAL_PREFIX.length) as keyof typeof globalsModuleInfoMap;
      const { namedExports, varName } = globalsModuleInfoMap[name];
      return [
        ...namedExports.map((key) => `export const ${key} = ${varName}[${JSON.stringify(key)}];`),
        `export default ${varName};`,
      ].join('\n');
    },
  };
}

/** Adds the CSS that a manager entry imports to the page in a `<style>` tag. */
function injectCss(): Plugin {
  return {
    name: 'forkbook-manager-css',
    transform: {
      filter: { id: /\.css$/ },
      handler(code) {
        return {
          code: `const style = document.createElement('style');\nstyle.textContent = ${JSON.stringify(code)};\ndocument.head.appendChild(style);`,
          moduleType: 'js',
        };
      },
    },
  };
}

/** The folder that holds all the entries, so each output keeps its path below it. */
function commonDirectory(files: string[]) {
  return files.map(dirname).reduce((common, directory) => {
    while (!`${directory}/`.startsWith(`${common}/`)) {
      common = dirname(common);
    }
    return common;
  });
}

/**
 * Bundles each manager entry into its own file with no imports. The manager page loads each file
 * as a module, so `import.meta` works. The code runs in a `try` block, so an entry that fails does
 * not stop the others.
 */
export async function bundleManagerEntries(config: ManagerBuildConfig): Promise<Compilation> {
  const { rolldown } = await import('rolldown');
  const base = config.entryPoints.length ? commonDirectory(config.entryPoints) : config.outdir;

  const outputFiles = await Promise.all(
    config.entryPoints.map(async (entry) => {
      const bundle = await rolldown({
        input: entry,
        platform: 'browser',
        tsconfig: config.tsconfig,
        logLevel: 'warn',
        resolve: {
          conditionNames: ['browser', 'module', 'default'],
          extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
        },
        moduleTypes: {
          '.js': 'jsx',
          ...Object.fromEntries(MEDIA_EXTENSIONS.map((extension) => [extension, 'dataurl'])),
        },
        transform: { target: BROWSER_TARGETS, jsx: 'react', define: config.define },
        plugins: [globalExternals(), injectCss()],
        // A manager entry runs for its side effects. Keep every module, even in a package that
        // says it has no side effects.
        treeshake: { moduleSideEffects: () => true, annotations: false },
      });
      try {
        const { output } = await bundle.generate({
          format: 'esm',
          codeSplitting: false,
          minify: config.minify ? true : 'dce-only',
          banner: 'try{',
          footer:
            '}catch(e){ console.error("[Forkbook] One of your manager-entries failed: " + import.meta.url, e); }',
        });
        return { path: join(config.outdir, relative(base, entry)), contents: output[0].code };
      } finally {
        await bundle.close();
      }
    })
  );

  return { outputFiles };
}
