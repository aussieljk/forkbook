import type { Meta, StoryObj } from '@aussieljk/forkbook/nextjs-vite';

import UnstableRethrow from './UnstableRethrow';

const meta = {
  component: UnstableRethrow,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta<typeof UnstableRethrow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCatch: Story = {
  args: {
    shouldCatch: true,
  },
};
