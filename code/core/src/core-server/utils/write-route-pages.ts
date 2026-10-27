import { mkdir, readFile, writeFile } from 'node:fs/promises';

import type { StoryIndex } from '@aussieljk/forkbook/internal/types';

import { join } from 'pathe';

import { withRouteDepth } from '../../builder-manager/utils/template.ts';
import { buildStoryPathMap, urlPathDepth } from '../../router/story-paths.ts';

/** Manager pages that are not stories, but must also open from a reload. */
export const STATIC_APP_ROUTES = [
  '/all',
  '/review',
  '/settings/about',
  '/settings/shortcuts',
  '/settings/whats-new',
];

/**
 * Writes a copy of the manager `index.html` at `<url path>/index.html` for each story, each docs
 * page and each manager page. A static host (Vercel, Netlify, GitHub Pages, S3, `npx serve`) then
 * serves the manager for a deep link such as `/example/button/primary`, with status 200 and no
 * rewrite rules. Each copy knows the depth of its path, so it finds the Forkbook root also when
 * Forkbook is hosted in a sub-folder.
 */
export async function writeRoutePages(outputDir: string, index: StoryIndex): Promise<number> {
  const html = await readFile(join(outputDir, 'index.html'), 'utf8');
  const urlPaths = [...buildStoryPathMap(Object.values(index.entries)).byUrl.keys()];
  const allPaths = [...STATIC_APP_ROUTES, ...urlPaths];

  await Promise.all(
    allPaths.map(async (urlPath) => {
      const dir = join(outputDir, urlPath);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'index.html'), withRouteDepth(html, urlPathDepth(urlPath)));
    })
  );
  return allPaths.length;
}
