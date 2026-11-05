import React from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import { ManagerContext } from '@aussieljk/forkbook/manager-api';
import { fn } from '@aussieljk/forkbook/test';

import { CallStates } from '../../instrumenter/types.ts';
import { TestDiscrepancyMessage } from './TestDiscrepancyMessage.tsx';

/** A manager context with only the state and API that these stories use. */
type ManagerContextValue = React.ComponentProps<typeof ManagerContext.Provider>['value'];

type Story = StoryObj<typeof TestDiscrepancyMessage>;
const managerContext = {
  state: {},
  api: {
    getDocsUrl: fn().mockName('api::getDocsUrl'),
    emit: fn().mockName('api::emit'),
  },
};

export default {
  title: 'TestDiscrepancyMessage',
  component: TestDiscrepancyMessage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (storyFn) => (
      <ManagerContext.Provider value={managerContext as unknown as ManagerContextValue}>
        {storyFn()}
      </ManagerContext.Provider>
    ),
  ],
} satisfies Meta<typeof TestDiscrepancyMessage>;

export const BrowserPassedCliFailed: Story = {
  args: {
    browserTestStatus: CallStates.DONE,
  },
};

export const CliFailedBrowserPassed: Story = {
  args: {
    browserTestStatus: CallStates.ERROR,
  },
};
