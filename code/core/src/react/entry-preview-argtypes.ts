import {
  enhanceArgTypes,
  extractComponentDescription,
} from '@aussieljk/forkbook/internal/docs-tools';
import type { ArgTypesEnhancer } from '@aussieljk/forkbook/internal/types';

import { extractArgTypes } from './extractArgTypes.ts';
import type { ReactRenderer } from './types.ts';

export const parameters = {
  docs: {
    extractArgTypes,
    extractComponentDescription,
  },
};

export const argTypesEnhancers: ArgTypesEnhancer<ReactRenderer>[] = [enhanceArgTypes];
