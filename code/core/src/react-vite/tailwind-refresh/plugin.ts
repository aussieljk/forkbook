import type { Plugin, ViteDevServer } from 'vite';

/** Files that can hold Tailwind class names. */
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|mdx?|html|vue|svelte|astro)$/;
const CSS_FILE = /\.(?:css|pcss|postcss|scss|sass|less|styl|stylus)(?:$|\?)/;
const TAILWIND_ENTRY = /@import\s+(?:url\()?\s*['"]tailwindcss(?:\/[^'"]*)?['"]|@tailwind\s/;

/** True when the CSS source loads Tailwind (v4 `@import "tailwindcss"` or v3 `@tailwind`). */
export const usesTailwind = (code: string) => TAILWIND_ENTRY.test(code);

/**
 * Tailwind scans the source files only when its CSS entry is transformed. When a new file is
 * added, Vite does not transform the CSS again, so the classes in the new file are missing. This
 * plugin finds the CSS files that load Tailwind, and reloads them when a source file is added.
 */
export function tailwindRefreshPlugin(): Plugin {
  const tailwindCss = new Set<string>();

  const refresh = async (server: ViteDevServer, file: string) => {
    if (!SOURCE_FILE.test(file) || file.includes('/node_modules/')) {
      return;
    }
    const client = server.environments.client;
    for (const cssFile of tailwindCss) {
      const modules = client.moduleGraph.getModulesByFile(cssFile);
      if (!modules) {
        continue;
      }
      for (const mod of modules) {
        client.moduleGraph.invalidateModule(mod);
        await client.reloadModule(mod);
      }
    }
  };

  return {
    name: 'forkbook:tailwind-refresh',
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) {
      if (!CSS_FILE.test(id)) {
        return;
      }
      const file = id.split('?')[0];
      if (usesTailwind(code)) {
        tailwindCss.add(file);
      } else {
        tailwindCss.delete(file);
      }
    },
    configureServer(server) {
      server.watcher.on('add', (file) => {
        void refresh(server, file);
      });
    },
  };
}
