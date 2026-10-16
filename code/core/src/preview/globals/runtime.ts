import * as CHANNELS from '@aussieljk/forkbook/internal/channels';
import * as CLIENT_LOGGER from '@aussieljk/forkbook/internal/client-logger';
import * as CORE_EVENTS from '@aussieljk/forkbook/internal/core-events';
import * as CORE_EVENTS_PREVIEW_ERRORS from '@aussieljk/forkbook/internal/preview-errors';
import * as TYPES from '@aussieljk/forkbook/internal/types';

import * as GLOBAL from '../../shared/global.ts';

import * as ACTIONS from '@aussieljk/forkbook/actions';
import * as PREVIEW_API from '@aussieljk/forkbook/preview-api';
import * as TEST from '@aussieljk/forkbook/test';

import type { globalsNameReferenceMap } from './globals.ts';

// Here we map the name of a module to their VALUE in the global scope.
export const globalsNameValueMap: Required<Record<keyof typeof globalsNameReferenceMap, any>> = {
  '@storybook/global': GLOBAL,

  '@aussieljk/forkbook/test': TEST,
  '@aussieljk/forkbook/actions': ACTIONS,
  '@aussieljk/forkbook/preview-api': PREVIEW_API,

  '@aussieljk/forkbook/internal/channels': CHANNELS,
  '@aussieljk/forkbook/internal/client-logger': CLIENT_LOGGER,
  '@aussieljk/forkbook/internal/core-events': CORE_EVENTS,
  '@aussieljk/forkbook/internal/types': TYPES,
  '@aussieljk/forkbook/internal/preview-errors': CORE_EVENTS_PREVIEW_ERRORS,
  '@aussieljk/forkbook/internal/preview-api': PREVIEW_API,
};
