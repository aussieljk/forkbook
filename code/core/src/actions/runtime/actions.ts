import type { ActionOptions, ActionsFunction, ActionsMap } from '../models/index.ts';
import { action } from './action.ts';
import { config } from './configureActions.ts';

export const actions: ActionsFunction = (...args: unknown[]) => {
  let options: ActionOptions = config;
  let names = args;
  // args argument can be a single argument as an array
  if (names.length === 1 && Array.isArray(names[0])) {
    [names] = names;
  }
  // last argument can be options
  if (names.length !== 1 && typeof names[names.length - 1] !== 'string') {
    options = {
      ...config,
      ...(names.pop() as ActionOptions),
    };
  }

  const namesObject: Record<string, string> =
    names.length !== 1 || typeof names[0] === 'string'
      ? Object.fromEntries((names as string[]).map((name) => [name, name]))
      : (names[0] as Record<string, string>);

  const actionsObject: ActionsMap = {};
  Object.keys(namesObject).forEach((name) => {
    actionsObject[name] = action(namesObject[name], options);
  });
  return actionsObject;
};
