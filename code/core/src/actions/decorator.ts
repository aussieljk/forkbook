import type { PartialStoryFn, Renderer } from '@aussieljk/forkbook/internal/types';

import { makeDecorator, useEffect } from '@aussieljk/forkbook/preview-api';

import { PARAM_KEY } from './constants.ts';
import type { ActionsMap } from './models/ActionsMap.ts';
import { actions } from './runtime/actions.ts';

const delegateEventSplitter = /^(\S+)\s*(.*)$/;

/** `actions` has typed overloads; `parameters.actions.handles` can hold any of their inputs. */
const callActions = actions as (...handles: unknown[]) => ActionsMap;

const createHandlers = (...handles: unknown[]) =>
  Object.entries(callActions(...handles)).map(([key, action]) => {
    const [, eventName, selector] = key.match(delegateEventSplitter) || [];
    return {
      eventName,
      handler: (event: Event) => {
        if (!selector || (event.target instanceof Element && event.target.closest(selector))) {
          action(event);
        }
      },
    };
  });

const applyEventHandlers = (...handles: unknown[]) => {
  const root =
    typeof globalThis.document !== 'undefined' &&
    globalThis.document.getElementById('storybook-root');
  useEffect(() => {
    if (root) {
      const handlers = createHandlers(...handles);
      handlers.forEach(({ eventName, handler }) => root.addEventListener(eventName, handler));
      return () =>
        handlers.forEach(({ eventName, handler }) => root.removeEventListener(eventName, handler));
    }
    return undefined;
  }, [root, handles]);
};

// This type is basically the same as DecoratorFunction from @aussieljk/forkbook/internal/types.
// We can not use DecoratorFunction though as the type has to be generic.
// Hard to explain, but you will understand when you try to solve this issue:
// https://github.com/storybookjs/storybook/issues/22384
/** @deprecated Will be removed in Forkbook v10 */
export const withActions: <T extends Renderer>(storyFn: PartialStoryFn<T>) => T['storyResult'] =
  makeDecorator({
    name: 'withActions',
    parameterName: PARAM_KEY,
    skipIfNoParametersOrOptions: true,
    wrapper: (getStory, context, { parameters }) => {
      if (parameters?.handles) {
        applyEventHandlers(...parameters.handles);
      }

      return getStory(context);
    },
  });
