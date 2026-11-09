import type { Plugin } from 'vite';

const BARE_FLAGS = new Set(['import', 'raw', 'url', 'inline', 'worker', 'direct']);

/**
 * A proxy such as a Next.js rewrite changes `?import&raw` to `?import=&raw=`. Vite does not see
 * `raw=` as the `raw` flag, so it cannot load non-JS files. This changes each known flag with an
 * empty value back to the bare flag.
 */
export function normaliseViteQueryFlags(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return url;
  }
  const hashStart = url.indexOf('#', queryStart);
  const query = url.slice(queryStart + 1, hashStart === -1 ? undefined : hashStart);
  const hash = hashStart === -1 ? '' : url.slice(hashStart);
  const parts = query.split('&').map((part) => {
    const name = part.endsWith('=') ? part.slice(0, -1) : undefined;
    return name && BARE_FLAGS.has(name) ? name : part;
  });
  return `${url.slice(0, queryStart)}?${parts.join('&')}${hash}`;
}

export function viteQueryFlagsPlugin(): Plugin {
  return {
    name: 'forkbook:normalise-query-flags',
    apply: 'serve',
    configureServer(server) {
      // Added directly (not in a returned hook), so it runs before Vite's own middlewares.
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          req.url = normaliseViteQueryFlags(req.url);
        }
        next();
      });
    },
  };
}
