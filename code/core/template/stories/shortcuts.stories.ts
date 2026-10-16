import { PREVIEW_KEYDOWN } from '@aussieljk/forkbook/internal/core-events';
import type { PlayFunctionContext } from '@aussieljk/forkbook/internal/csf';

import { global as globalThis } from '@storybook/global';

import { expect, fn, userEvent, within } from '@aussieljk/forkbook/test';

export default {
  component: globalThis.__TEMPLATE_COMPONENTS__.Form,
  tags: ['autodocs'],
  args: {
    onSubmit: fn(),
    onSuccess: fn(),
  },
};

export const KeydownDuringPlay = {
  play: async ({ canvasElement }: PlayFunctionContext<any>) => {
    const channel = globalThis.__FORKBOOK_ADDONS_CHANNEL__;

    const previewKeydown = fn();
    channel.on(PREVIEW_KEYDOWN, previewKeydown);
    const button = await within(canvasElement).findByText('Submit');
    await userEvent.type(button, 's');

    await expect(previewKeydown).not.toBeCalled();
  },
};
