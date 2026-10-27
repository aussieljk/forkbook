import React from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import { ALL_STORIES_PATH, HOME_PATH } from '@aussieljk/forkbook/internal/router';
import { expect, fn, userEvent, within } from '@aussieljk/forkbook/test';

import { PageLinksView } from './PageLinks.tsx';

const meta = {
  component: PageLinksView,
  title: 'Sidebar/PageLinks',
  globals: { sb_theme: 'side-by-side' },
  decorators: [
    (storyFn) => <div style={{ padding: '0 20px', maxWidth: '230px' }}>{storyFn()}</div>,
  ],
  args: {
    showHome: true,
    activePath: HOME_PATH,
    getHref: (path: string) => (path === HOME_PATH ? '/' : '/all'),
    onNavigate: fn(),
  },
} satisfies Meta<typeof PageLinksView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HomeActive: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await userEvent.click(canvas.getByRole('link', { name: 'All stories' }));
    await expect(args.onNavigate).toHaveBeenCalledWith(ALL_STORIES_PATH);
  },
};

export const AllStoriesActive: Story = {
  args: { activePath: ALL_STORIES_PATH },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'All stories' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  },
};

export const NoHome: Story = {
  args: { showHome: false, activePath: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('link', { name: 'Home' })).toBeNull();
    await expect(canvas.getByRole('link', { name: 'All stories' })).toHaveAttribute('href', '/all');
  },
};
