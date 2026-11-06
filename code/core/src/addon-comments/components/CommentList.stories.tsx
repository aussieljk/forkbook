import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';
import { expect, fn, userEvent, within } from '@aussieljk/forkbook/test';

import type { StoryComment } from '../types.ts';
import { CommentList } from './CommentList.tsx';

const comments: StoryComment[] = [
  {
    id: 'a1',
    status: 'open',
    createdAt: '2026-01-01T00:00:00.000Z',
    storyId: 'button--primary',
    title: 'Button',
    name: 'Primary',
    importPath: './src/Button.stories.tsx',
    element: { selector: '#storybook-root > button', text: 'Click me' },
    args: { label: 'Click me' },
    note: 'The padding is too small.',
  },
  {
    id: 'b2',
    status: 'resolved',
    createdAt: '2026-01-01T00:00:00.000Z',
    resolvedAt: '2026-01-02T00:00:00.000Z',
    storyId: 'card--default',
    title: 'Card',
    name: 'Default',
    note: 'Use the brand colour for the border.',
    reply: 'Changed the border to the secondary colour.',
  },
];

const meta = {
  component: CommentList,
  args: {
    comments,
    currentStoryId: 'button--primary',
    onResolve: fn(),
    onReopen: fn(),
    onDelete: fn(),
    onSelectStory: fn(),
  },
} satisfies Meta<typeof CommentList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('The padding is too small.')).toBeVisible();
    await expect(canvas.getByText('#storybook-root > button')).toBeVisible();
    await expect(canvas.getByText('Whole story')).toBeVisible();
    await expect(canvas.getAllByRole('button', { name: 'Copy for Claude' })).toHaveLength(2);

    await userEvent.click(canvas.getByRole('button', { name: 'Resolve' }));
    await expect(args.onResolve).toHaveBeenCalledWith(comments[0]);

    await userEvent.click(canvas.getByRole('button', { name: 'Reopen' }));
    await expect(args.onReopen).toHaveBeenCalledWith(comments[1]);
  },
};

export const Empty: Story = {
  args: { comments: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('No comments yet.')).toBeVisible();
  },
};
