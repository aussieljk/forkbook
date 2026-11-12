import { createFileSystemCache } from './file-cache.ts';
import { resolvePathInForkbookCache } from './resolve-path-in-cache.ts';

export const cache = createFileSystemCache({
  basePath: resolvePathInForkbookCache('dev-server'),
  ns: 'forkbook', // A grouping namespace for items.
});
