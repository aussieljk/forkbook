import type { Meta, StoryObj } from '@aussieljk/forkbook/nextjs-vite';

import { expect } from '@aussieljk/forkbook/test';

import EnvironmentVariables from './EnvironmentVariables';

const meta = {
  component: EnvironmentVariables,
} satisfies Meta<typeof EnvironmentVariables>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('nextConfigEnv')).toHaveTextContent('next-config-env');
    await expect(canvas.getByTestId('nextPrefixEnv')).toHaveTextContent('example1');
    await expect(canvas.getByTestId('nonNextPrefixEnv')).toHaveTextContent('RESTRICTED_VALUE');
  },
};
