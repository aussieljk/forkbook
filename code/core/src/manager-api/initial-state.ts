import merge from './lib/merge.ts';
import type { State } from './root.tsx';

// Returns the initialState of the app
const main = (...additions: Partial<State>[]): State =>
  additions.reduce<State>((acc, item) => merge<State>(acc, item), {} as State);

export default main;
