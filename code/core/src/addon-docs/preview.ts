import type { Parameters, PreparedStory, TagOptions } from '@aussieljk/forkbook/internal/types';

const excludeTags = Object.entries<Partial<TagOptions>>(globalThis.TAGS_OPTIONS ?? {}).reduce(
  (acc, [tag, option]) => {
    if (option.hideFromAutodocs) {
      acc[tag] = true;
    }
    return acc;
  },
  {} as Record<string, boolean>
);

export const parameters: Parameters = {
  docs: {
    renderer: async () => {
      const { DocsRenderer } = await import('./DocsRenderer');
      return new DocsRenderer();
    },
    stories: {
      filter: (story: PreparedStory) => {
        const tags = story.tags || [];
        return (
          tags.filter((tag) => excludeTags[tag]).length === 0 && !story.parameters.docs?.disable
        );
      },
    },
  },
};
