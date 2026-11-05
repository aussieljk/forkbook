import type { DecoratorFunction, LegacyStoryFn } from '@aussieljk/forkbook/internal/types';

import { applyDecorators as defaultDecorateStory } from '../applyDecorators';
import type { ReactRenderer } from '../types';
import { jsxDecorator } from './jsxDecorator';

export const applyDecorators = (
  storyFn: LegacyStoryFn<ReactRenderer>,
  decorators: DecoratorFunction<ReactRenderer>[]
): LegacyStoryFn<ReactRenderer> => {
  // `originalFn` is set on hooked decorators, and is not part of the decorator type.
  const jsxIndex = decorators.findIndex(
    (d) => (d as typeof d & { originalFn?: unknown }).originalFn === jsxDecorator
  );

  const reorderedDecorators =
    jsxIndex === -1 ? decorators : [...decorators.splice(jsxIndex, 1), ...decorators];

  return defaultDecorateStory(storyFn, reorderedDecorators);
};
