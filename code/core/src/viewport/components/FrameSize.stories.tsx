import { expect, fn, userEvent, within } from '@aussieljk/forkbook/test';

import preview from '../../../../.forkbook/preview.tsx';
import { FrameSize } from './FrameSize.tsx';

const meta = preview.meta({
  component: FrameSize,
  args: {
    size: { width: 1280, height: 720 },
    onApply: fn(),
  },
});

export const Default = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('1280×720');
  },
});

export const Disabled = meta.story({
  args: { disabled: true },
});

export const EditWidth = meta.story({
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Frame width/ }));
    const input = canvas.getByRole('spinbutton', { name: 'Frame width' });
    await userEvent.clear(input);
    await userEvent.type(input, '400{Enter}');
    await expect(args.onApply).toHaveBeenCalledWith({ width: 400, height: 720 });
  },
});

export const EditHeightOnBlur = meta.story({
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Frame height/ }));
    const input = canvas.getByRole('spinbutton', { name: 'Frame height' });
    await userEvent.clear(input);
    await userEvent.type(input, '500');
    await userEvent.tab();
    await expect(args.onApply).toHaveBeenCalledWith({ width: 1280, height: 500 });
  },
});

export const EscapeCancels = meta.story({
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Frame width/ }));
    const input = canvas.getByRole('spinbutton', { name: 'Frame width' });
    await userEvent.clear(input);
    await userEvent.type(input, '300{Escape}');
    await expect(args.onApply).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: /Frame width/ })).toHaveTextContent('1280');
  },
});
