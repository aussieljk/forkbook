import { createFileSystemCache } from './file-cache.ts';
import { resolvePathInStorybookCache } from './resolve-path-in-sb-cache.ts';

export const cache = createFileSystemCache({
  basePath: resolvePathInStorybookCache('dev-server'),
  ns: 'forkbook', // A grouping namespace for items.
});
