import React from 'react';

import { ManagerContext } from '@aussieljk/forkbook/manager-api';
import { fn } from '@aussieljk/forkbook/test';

import preview from '../../../../.forkbook/preview.tsx';
import { TestDiscrepancyMessage } from './TestDiscrepancyMessage.tsx';

const managerContext: any = {
  state: {},
  api: {
    getDocsUrl: fn().mockName('api::getDocsUrl'),
    getCurrentParameter: fn().mockName('api::getCurrentParameter'),
  },
};

const meta = preview.meta({
  title: 'TestDiscrepancyMessage',
  component: TestDiscrepancyMessage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (storyFn) => (
      <ManagerContext.Provider value={managerContext}>{storyFn()}</ManagerContext.Provider>
    ),
  ],
});

export const BrowserPassedCliFailed = meta.story({
  args: {
    discrepancy: 'browserPassedCliFailed',
  },
});

export const CliPassedBrowserFailed = meta.story({
  args: {
    discrepancy: 'cliPassedBrowserFailed',
  },
});

export const CliFailedButModeManual = meta.story({
  args: {
    discrepancy: 'cliFailedButModeManual',
  },
});
