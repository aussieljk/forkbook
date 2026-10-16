import type { PartialStoryFn, StoryContext } from '@aussieljk/forkbook/internal/types';

import { global as globalThis } from '../../../src/shared/global.ts';

export default {
  component: globalThis.__TEMPLATE_COMPONENTS__.Pre,
  decorators: [
    (storyFn: PartialStoryFn, context: StoryContext) =>
      storyFn({ args: { object: { ...context.args } } }),
  ],
};

export const DisableTable = {
  args: { a: 'a', b: 'b' },
  argTypes: {
    b: { table: { disable: true } },
  },
};

export const DisableControl = {
  args: { a: 'a', b: 'b' },
  argTypes: {
    b: { control: { disable: true } },
  },
};
