import { readFile } from 'node:fs/promises';

import type * as esbuild from 'esbuild';
import { transform } from 'lightningcss';
import { relative, resolve } from 'pathe';
import type { Plugin as RolldownPlugin } from 'rolldown';

const CODE_DIR = resolve(import.meta.dirname, '..', '..', '..', 'code');

const CSS_FILTER = /\.css$/;

// Only our own CSS. Dependencies keep the default CSS handling of the bundler.
const isOwnCss = (file: string) => !file.includes('/node_modules/');

/**
 * Compiles a CSS file to a JS module. The module adds the CSS to the page once, in a `<style>` tag,
 * and exports the class names of a CSS module (`*.module.css`). This way the published packages work
 * without any CSS support in the consumer's bundler.
 */
export async function cssToJs(file: string) {
  const name = relative(CODE_DIR, file);
  const { code, exports } = transform({
    filename: name,
    code: await readFile(file),
    // Grid line and area names stay global: the layout sets `grid-template-areas` inline with the
    // plain names, the same as Vite's CSS modules do.
    cssModules: file.endsWith('.module.css')
      ? { pattern: 'fb-[hash]-[local]', grid: false }
      : false,
    minify: true,
  });

  const classes = Object.fromEntries(
    Object.entries(exports ?? {}).map(([key, { name: className, composes }]) => [
      key,
      [className, ...composes.map((item) => item.name)].join(' '),
    ])
  );

  return [
    `const id = ${JSON.stringify(name)};`,
    `if (typeof document !== 'undefined' && !document.querySelector(\`style[data-fb-css="\${id}"]\`)) {`,
    `  const style = document.createElement('style');`,
    `  style.setAttribute('data-fb-css', id);`,
    `  style.textContent = ${JSON.stringify(code.toString())};`,
    `  document.head.appendChild(style);`,
    `}`,
    `export default ${JSON.stringify(classes)};`,
  ].join('\n');
}

export const esbuildCssPlugin = (): esbuild.Plugin => ({
  name: 'storybook-css',
  setup(build) {
    build.onResolve({ filter: CSS_FILTER }, (args) => {
      if (!args.path.startsWith('.')) {
        return undefined;
      }
      const path = resolve(args.resolveDir, args.path);
      return isOwnCss(path) ? { path, namespace: 'storybook-css', sideEffects: true } : undefined;
    });
    build.onLoad({ filter: CSS_FILTER, namespace: 'storybook-css' }, async (args) => ({
      contents: await cssToJs(args.path),
      loader: 'js',
      watchFiles: [args.path],
    }));
  },
});

export const rolldownCssPlugin = (): RolldownPlugin => ({
  name: 'storybook-css',
  async load(id) {
    if (!CSS_FILTER.test(id) || !isOwnCss(id)) {
      return null;
    }
    this.addWatchFile(id);
    return { code: await cssToJs(id), moduleType: 'js', moduleSideEffects: true };
  },
});
