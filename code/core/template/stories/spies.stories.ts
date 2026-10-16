import { global as globalThis } from '../../src/shared/global.ts';

import { spyOn } from '@aussieljk/forkbook/test';

const meta = {
  component: globalThis.__TEMPLATE_COMPONENTS__.Button,
  beforeEach() {
    spyOn(console, 'log').mockName('console.log');
    console.log('first');
  },
};

export default meta;

export const ShowSpyOnInActions = {
  parameters: {
    chromatic: { disableSnapshot: true },
  },
  beforeEach() {
    console.log('second');
  },
  args: {
    label: 'Button',
    onClick: () => {
      console.log('third');
    },
  },
};
