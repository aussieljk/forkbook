import { copyFile, mkdir, readFile } from 'node:fs/promises';

import type { StoryIndex } from '@aussieljk/forkbook/internal/types';

import { dirname, join } from 'pathe';
import type { Polka } from 'polka';

import { THUMBNAIL_ROUTE, thumbnailContentType, thumbnailFile } from '../../shared/thumbnails.ts';

/** Serves the local thumbnail files (`/thumbnails/<path from the project root>`) in dev. */
export function registerThumbnailRoute(app: Polka, workingDir: string) {
  app.use(`/${THUMBNAIL_ROUTE}`, async (req, res) => {
    // Polka removes the mount path from `req.url`, so use the full URL.
    const url = (req.originalUrl ?? req.url ?? '').split('?')[0];
    const file = thumbnailFile(url, workingDir);
    try {
      if (!file) {
        throw new Error('Not a thumbnail');
      }
      const body = await readFile(file);
      res.setHeader('Content-Type', thumbnailContentType(file));
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
}

/** Copies the local thumbnail files of the index into the static build. Returns the count. */
export async function copyThumbnails(outputDir: string, index: StoryIndex, workingDir: string) {
  const paths = new Set(
    Object.values(index.entries)
      .map((entry) => entry.thumbnail)
      .filter((path): path is string => !!path && path.startsWith(`${THUMBNAIL_ROUTE}/`))
  );
  let count = 0;
  await Promise.all(
    [...paths].map(async (path) => {
      const file = thumbnailFile(path, workingDir);
      if (!file) {
        return;
      }
      const target = join(outputDir, path);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(file, target).then(
        () => count++,
        () => undefined
      );
    })
  );
  return count;
}
