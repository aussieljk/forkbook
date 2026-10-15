import type { ArgsEnhancer } from '@aussieljk/forkbook/internal/types';

import { addActionsFromArgTypes, inferActionsFromArgTypesRegex } from './addArgsHelpers.ts';

export const argsEnhancers: ArgsEnhancer[] = [
  addActionsFromArgTypes,
  inferActionsFromArgTypesRegex,
];
