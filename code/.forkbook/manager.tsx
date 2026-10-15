import { startCase } from 'es-toolkit/string';
import { addons } from '@aussieljk/forkbook/manager-api';

addons.setConfig({
  sidebar: {
    renderAriaLabel: ({ name, type }) => `${type} ${name}`,
    renderLabel: ({ name, type }) => (type === 'story' ? name : startCase(name)),
  },
});

import '../core/src/shared/open-service/sync-test/manager.tsx';
