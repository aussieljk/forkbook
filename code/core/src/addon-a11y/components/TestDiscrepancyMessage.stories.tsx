import type { ComponentProps } from 'react';
import React from 'react';

import { ManagerContext } from '@aussieljk/forkbook/manager-api';
import { fn } from '@aussieljk/forkbook/test';

import preview from '../../../../.forkbook/preview.tsx';
import { TestDiscrepancyMessage } from './TestDiscrepancyMessage.tsx';

/** A manager context with only the state and API that the component uses. */
const asManagerContext = (value: object) =>
  value as ComponentProps<typeof ManagerContext.Provider>['value'];

const managerContext = asManagerContext({
  state: {},
  api: {
    getDocsUrl: fn().mockName('api::getDocsUrl'),
    getCurrentParameter: fn().mockName('api::getCurrentParameter'),
  },
});

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
