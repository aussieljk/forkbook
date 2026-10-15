import 'vitest';

import type { StorybookConfigRaw } from '@aussieljk/forkbook/internal/types';

import type {
  FORKBOOK_CORE_GHOST_STORIES_PROVIDE_KEY,
  FORKBOOK_CORE_RENDER_ANALYSIS_PROVIDE_KEY,
  FORKBOOK_TEST_FEATURES_PROVIDE_KEY,
  FORKBOOK_TEST_INITIAL_GLOBALS_PROVIDE_KEY,
  FORKBOOK_TEST_PROVIDE_KEY,
} from './constants.ts';

declare module 'vitest' {
  interface ProvidedContext {
    [FORKBOOK_TEST_FEATURES_PROVIDE_KEY]: StorybookConfigRaw['features'];
    [FORKBOOK_TEST_PROVIDE_KEY]: Record<string, unknown>;
    [FORKBOOK_CORE_GHOST_STORIES_PROVIDE_KEY]: boolean;
    [FORKBOOK_CORE_RENDER_ANALYSIS_PROVIDE_KEY]: boolean;
    [FORKBOOK_TEST_INITIAL_GLOBALS_PROVIDE_KEY]: Record<string, unknown>;
  }
}
