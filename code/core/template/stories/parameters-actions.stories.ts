import { global as globalThis } from '../../src/shared/global.ts';

import { withActions } from '@aussieljk/forkbook/actions/decorator';

export default {
  component: globalThis.__TEMPLATE_COMPONENTS__.Button,
  args: {
    label: 'Click Me!',
  },
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};

export const Basic = {
  parameters: {
    actions: {
      handles: [{ click: 'clicked', contextmenu: 'right clicked' }],
    },
  },
  decorators: [withActions],
};
