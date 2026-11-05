import type { RouterData } from '@aussieljk/forkbook/internal/router';
import type { API_ProviderData } from '@aussieljk/forkbook/internal/types';

import type { API, State } from '../root.tsx';
import type Store from '../store.ts';

/** `Options` are extra init options that only tests pass, for example `runCheck` for refs. */
export type ModuleFn<APIType = unknown, StateType = unknown, Options = object> = (
  m: ModuleArgs,
  options?: Options
) => {
  init?: () => void | Promise<void>;
  api: APIType;
  state: StateType;
};

export type ModuleArgs = RouterData &
  API_ProviderData<API> & {
    mode?: 'production' | 'development';
    state: State;
    fullAPI: API;
    store: Store;
  };
