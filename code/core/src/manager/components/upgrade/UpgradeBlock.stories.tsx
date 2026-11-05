import React from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import { ManagerContext } from '@aussieljk/forkbook/manager-api';
import { fn } from '@aussieljk/forkbook/test';

import { UpgradeBlock } from './UpgradeBlock.tsx';

/** A manager context with only the state and API that these stories use. */
type ManagerContextValue = React.ComponentProps<typeof ManagerContext.Provider>['value'];

const meta = {
  component: UpgradeBlock,
  title: 'UpgradeBlock',
  decorators: [
    (storyFn) => (
      <ManagerContext.Provider
        value={
          {
            api: {
              getCurrentVersion: () => ({
                version: '7.2.2-alpha.0',
              }),
            },
          } as unknown as ManagerContextValue
        }
      >
        {storyFn()}
      </ManagerContext.Provider>
    ),
  ],
  args: { onNavigateToWhatsNew: fn() },
} satisfies Meta<typeof UpgradeBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
