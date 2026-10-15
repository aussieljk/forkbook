import {
  STORY_FILE_TEST_REGEXP,
  getStoryImportPathFromEntry,
} from '@aussieljk/forkbook/internal/common';
import type { StoryDocsProviderPreset } from '@aussieljk/forkbook/internal/types';

import { buildStoryDocsPayload } from './build-story-docs.ts';

/**
 * React renderer story-docs provider.
 *
 * Receives the authoritative index `entry` from the story-docs service. Bails to `nextStoryDocs`
 * when the entry does not resolve to a CSF story file. Otherwise delegates to
 * {@link buildStoryDocsPayload} which parses the CSF file and returns snippets + imports without
 * running RCM.
 *
 * When extraction succeeds, the payload is merged with downstream via the documented
 * `{ ...downstream, ...ours }` spread idiom (matching {@link experimental_docgenProvider}); our
 * payload wins per top-level key, so `stories` is replaced wholesale rather than merged per story.
 */
export const experimental_storyDocsProvider: StoryDocsProviderPreset = async (nextStoryDocs) => {
  return async (input) => {
    const storyImportPath = getStoryImportPathFromEntry(input.entry);
    if (!storyImportPath || !STORY_FILE_TEST_REGEXP.test(storyImportPath)) {
      return nextStoryDocs(input);
    }

    const ours = await buildStoryDocsPayload(input, {});
    if (!ours) {
      return nextStoryDocs(input);
    }

    const downstream = await nextStoryDocs(input);
    return { ...downstream, ...ours };
  };
};
