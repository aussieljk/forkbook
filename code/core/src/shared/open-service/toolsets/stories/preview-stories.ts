import type { StoryIndex } from '@aussieljk/forkbook/internal/types';

import { buildStoryPathMap, toUrlPath } from '../../../../router/story-paths.ts';
import { buildArgsParam } from '../../../../router/utils.ts';
import type { PreviewStoriesOutput } from './definition.ts';
import { findStoryIds } from './find-story-ids.ts';
import type { StoryInput } from './story-input.ts';

export type PreviewStoriesParams = {
  origin: string;
  index: StoryIndex;
  stories: StoryInput[];
};

/**
 * Resolves story selectors to preview URLs (and per-input errors).
 *
 * Pure helper: callers supply origin + index; no I/O.
 */
export function previewStories({
  origin,
  index,
  stories,
}: PreviewStoriesParams): Pick<PreviewStoriesOutput, 'stories'> {
  const resolvedStories = findStoryIds(index, stories);
  const result: PreviewStoriesOutput['stories'] = [];
  const pathMap = buildStoryPathMap(Object.values(index.entries));
  const base = origin.replace(/\/$/, '');

  for (const story of resolvedStories) {
    if ('errorMessage' in story) {
      result.push({
        input: story.input,
        error: story.errorMessage,
      });
      continue;
    }

    const indexEntry = story.entry;
    const query: string[] = [];
    const argsParam = buildArgsParam({}, story.input.props ?? {});
    if (argsParam) {
      query.push(`args=${argsParam}`);
    }
    const globalsParam = buildArgsParam({}, story.input.globals ?? {});
    if (globalsParam) {
      query.push(`globals=${globalsParam}`);
    }
    const search = query.length ? `?${query.join('&')}` : '';
    const previewUrl = `${base}${toUrlPath(`/story/${indexEntry.id}`, pathMap)}${search}`;
    const iframeUrl = `${base}/iframe.html?${['id=' + indexEntry.id, ...query].join('&')}`;

    result.push({
      title: indexEntry.title,
      name: indexEntry.name,
      previewUrl,
      iframeUrl,
    });
  }

  return { stories: result };
}
