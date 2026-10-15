import * as REACT from 'react';
import * as REACT_DOM from 'react-dom';
import * as REACT_DOM_CLIENT from 'react-dom/client';
import * as REACT_JSX_RUNTIME from 'react/jsx-runtime';

import * as CHANNELS from '@aussieljk/forkbook/internal/channels';
import * as CLIENT_LOGGER from '@aussieljk/forkbook/internal/client-logger';
import * as COMPONENTS from '@aussieljk/forkbook/internal/components';
import * as EVENTS from '@aussieljk/forkbook/internal/core-events';
import * as EVENTS_MANAGER_ERRORS from '@aussieljk/forkbook/internal/manager-errors';
import * as ROUTER from '@aussieljk/forkbook/internal/router';
import * as TYPES from '@aussieljk/forkbook/internal/types';

import * as ICONS from '@storybook/icons';

import * as MANAGER_API from '@aussieljk/forkbook/manager-api';
import * as TEST from '@aussieljk/forkbook/test';
import * as THEMING from '@aussieljk/forkbook/theming';
import * as THEMINGCREATE from '@aussieljk/forkbook/theming/create';

import type { globalsNameReferenceMap } from './globals.ts';

// Here we map the name of a module to their VALUE in the global scope.
export const globalsNameValueMap: Required<Record<keyof typeof globalsNameReferenceMap, any>> = {
  react: REACT,
  'react/jsx-runtime': REACT_JSX_RUNTIME,
  // The manager uses production React, whose development runtime does not provide jsxDEV.
  'react/jsx-dev-runtime': {
    Fragment: REACT_JSX_RUNTIME.Fragment,
    jsxDEV: REACT_JSX_RUNTIME.jsx,
  },
  'react-dom': REACT_DOM,
  'react-dom/client': REACT_DOM_CLIENT,
  '@storybook/icons': ICONS,

  '@aussieljk/forkbook/manager-api': MANAGER_API,

  '@aussieljk/forkbook/theming': THEMING,
  '@aussieljk/forkbook/theming/create': THEMINGCREATE,

  '@aussieljk/forkbook/test': TEST,

  '@aussieljk/forkbook/internal/channels': CHANNELS,
  '@aussieljk/forkbook/internal/client-logger': CLIENT_LOGGER,
  '@aussieljk/forkbook/internal/components': COMPONENTS,
  '@aussieljk/forkbook/internal/core-events': EVENTS,
  '@aussieljk/forkbook/internal/manager-errors': EVENTS_MANAGER_ERRORS,
  '@aussieljk/forkbook/internal/router': ROUTER,
  '@aussieljk/forkbook/internal/types': TYPES,
};
