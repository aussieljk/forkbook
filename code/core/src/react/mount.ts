import type { BaseAnnotations } from '@aussieljk/forkbook/internal/types';

import { type ReactRenderer, type StoryContext } from './public-types.ts';

export const mount: BaseAnnotations<ReactRenderer>['mount'] =
  (context: StoryContext) => async (ui) => {
    if (ui != null) {
      context.originalStoryFn = () => ui;
    }
    await context.renderToCanvas();
    return context.canvas;
  };
