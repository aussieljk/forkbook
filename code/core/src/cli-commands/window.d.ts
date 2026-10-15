import type { Renderer } from '@aussieljk/forkbook/internal/types';

import type { StoryStore } from '@aussieljk/forkbook/preview-api';

declare global {
  interface Window {
    __STORYBOOK_STORY_STORE__: StoryStore<Renderer>;
  }
}
