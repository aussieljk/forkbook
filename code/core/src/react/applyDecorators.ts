import React from 'react';

import type { DecoratorFunction, LegacyStoryFn } from '@aussieljk/forkbook/internal/types';

import { defaultDecorateStory } from '@aussieljk/forkbook/preview-api';

import type { ReactRenderer } from './types.ts';

export const applyDecorators = (
  storyFn: LegacyStoryFn<ReactRenderer>,
  decorators: DecoratorFunction<ReactRenderer>[]
): LegacyStoryFn<ReactRenderer> => {
  return defaultDecorateStory((context) => React.createElement(storyFn, context), decorators);
};
