import type { PlayFunctionContext } from '@aussieljk/forkbook/internal/types';

import { global as globalThis } from '../../src/shared/global.ts';

import { expect } from '@aussieljk/forkbook/test';

export default {
  component: globalThis.__TEMPLATE_COMPONENTS__.Pre,
  title: 'manual title',
  args: { text: 'No content' },
};

export const Default = {
  play: async ({ title }: PlayFunctionContext<any>) => {
    await expect(title).toBe('core/manual title');
  },
};
