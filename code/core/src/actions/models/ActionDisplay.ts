import type { ActionOptions } from './ActionOptions.ts';

export interface ActionDisplay {
  id: string;
  data: {
    name: string;
    /** One argument on its own, or an array when the action got more than one. */
    args: unknown;
  };
  count: number;
  options: ActionOptions;
}
