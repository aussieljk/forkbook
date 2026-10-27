import { expect, fn, userEvent, within } from '@aussieljk/forkbook/test';

import preview from '../../../../.forkbook/preview.tsx';
import { MINIMAL_VIEWPORTS } from '../defaults.ts';
import { ViewportSegments } from './ViewportSegments.tsx';

const meta = preview.meta({
  component: ViewportSegments,
  args: {
    viewports: MINIMAL_VIEWPORTS,
    value: undefined,
    isDefault: true,
    onSelect: fn(),
    onReset: fn(),
  },
});

export const Default = meta.story({
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /Full size/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(canvas.getByRole('button', { name: /Mobile/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(canvas.getByRole('button', { name: /More viewports/ })).toBeInTheDocument();
  },
});

export const SelectTablet = meta.story({
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Tablet/ }));
    await expect(args.onSelect).toHaveBeenCalledWith('tablet');
  },
});

export const MobileSelected = meta.story({
  args: { value: 'mobile1', isDefault: false },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /Mobile/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await userEvent.click(canvas.getByRole('button', { name: /Full size/ }));
    await expect(args.onReset).toHaveBeenCalled();
  },
});

export const NoMatchingSegments = meta.story({
  args: {
    viewports: {
      watch: { name: 'Watch', styles: { width: '200px', height: '200px' }, type: 'watch' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: /Mobile/ })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: /Desktop/ })).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /More viewports/ })).toBeInTheDocument();
  },
});

export const Locked = meta.story({
  args: { isLocked: true, value: 'desktop', isDefault: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /Desktop/ })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    await expect(canvas.getByRole('button', { name: /Full size/ })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  },
});
