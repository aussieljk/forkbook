import singletonRouter, * as originalRouter from 'next/dist/client/router.js';
import type { NextRouter, SingletonRouter } from 'next/router.js';
import { NextjsRouterMocksNotAvailable } from '@aussieljk/forkbook/internal/preview-errors';
import type { Mock } from '@aussieljk/forkbook/test';
import { fn } from '@aussieljk/forkbook/test';

const defaultRouterState = {
  route: '/',
  asPath: '/',
  basePath: '/',
  pathname: '/',
  query: {},
  isFallback: false,
  isLocaleDomain: false,
  isReady: true,
  isPreview: false,
};

let routerAPI: {
  push: Mock;
  replace: Mock;
  reload: Mock;
  back: Mock;
  forward: Mock;
  prefetch: Mock;
  beforePopState: Mock;
  events: {
    on: Mock;
    off: Mock;
    emit: Mock;
  };
} & typeof defaultRouterState;

type RouterActions = Omit<typeof routerAPI, keyof typeof defaultRouterState | 'events'>;
type RouterEvents = (typeof routerAPI)['events'];

/**
 * Creates a next/router router API mock. Used internally.
 * @ignore
 * @internal
 * */
export const createRouter = (overrides: Partial<NextRouter>) => {
  const routerActions: RouterActions = {
    push: fn((..._args: unknown[]) => {
      return Promise.resolve(true);
    }).mockName('next/router::useRouter().push'),
    replace: fn((..._args: unknown[]) => {
      return Promise.resolve(true);
    }).mockName('next/router::useRouter().replace'),
    reload: fn((..._args: unknown[]) => {}).mockName('next/router::useRouter().reload'),
    back: fn((..._args: unknown[]) => {}).mockName('next/router::useRouter().back'),
    forward: fn(() => {}).mockName('next/router::useRouter().forward'),
    prefetch: fn((..._args: unknown[]) => {
      return Promise.resolve();
    }).mockName('next/router::useRouter().prefetch'),
    beforePopState: fn((..._args: unknown[]) => {}).mockName(
      'next/router::useRouter().beforePopState'
    ),
  };

  const routerEvents: RouterEvents = {
    on: fn((..._args: unknown[]) => {}).mockName('next/router::useRouter().events.on'),
    off: fn((..._args: unknown[]) => {}).mockName('next/router::useRouter().events.off'),
    emit: fn((..._args: unknown[]) => {}).mockName('next/router::useRouter().events.emit'),
  };

  if (overrides) {
    for (const key of Object.keys(routerActions) as (keyof RouterActions)[]) {
      const override = overrides[key];
      if (override) {
        routerActions[key] = fn((...args: unknown[]) => {
          return Reflect.apply(override, overrides, args);
        }).mockName(`useRouter().${key}`);
      }
    }
  }

  const overrideEvents = overrides?.events;
  if (overrideEvents) {
    for (const key of Object.keys(routerEvents) as (keyof RouterEvents)[]) {
      routerEvents[key] = fn((...args: unknown[]) => {
        return Reflect.apply(overrideEvents[key], overrideEvents, args);
      }).mockName(`useRouter().events.${key}`);
    }
  }

  routerAPI = {
    ...defaultRouterState,
    ...overrides,
    ...routerActions,
    events: routerEvents,
  };

  // overwrite the singleton router from next/router
  (singletonRouter as unknown as SingletonRouter).router =
    routerAPI as unknown as SingletonRouter['router'];

  for (const cb of (singletonRouter as unknown as SingletonRouter).readyCallbacks) {
    cb();
  }

  (singletonRouter as unknown as SingletonRouter).readyCallbacks = [];

  return routerAPI as unknown as NextRouter;
};

export const getRouter = () => {
  if (!routerAPI) {
    throw new NextjsRouterMocksNotAvailable({
      importType: 'next/router',
    });
  }

  return routerAPI;
};

// re-exports of the actual module
export * from 'next/dist/client/router';
// Same root cause as the `next/navigation` mock: `export *` from CommonJS is invisible to
// static ESM analysis (storybookjs/storybook#34688). Only `Router` is declared in Next.js'
// own types, the remaining runtime members stay reachable via the namespace only.
export { Router } from 'next/dist/client/router';
export default singletonRouter;

// mock utilities/overrides (as of Next v14.2.0)
// passthrough mocks - keep original implementation but allow for spying
export const useRouter: Mock<() => NextRouter> = fn(originalRouter.useRouter).mockName(
  'next/router::useRouter'
);
export const withRouter: Mock<typeof originalRouter.withRouter> = fn(
  originalRouter.withRouter
).mockName('next/router::withRouter');
