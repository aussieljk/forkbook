/** `query.subscribe(...)`: re-runs the handler when tracked state changes and fires the reactive load. */

import { computed, effect, signal, untracked } from '@preact/signals-core';
import { isEqual } from 'es-toolkit/predicate';
import { buildQueryState, toError } from './query-state.ts';
import type { QueryLifecycle } from './query-state.ts';
import type { LoadCtx, LoadSelf, QueryState } from './types.ts';
import { detachSnapshot } from './query-load-registry.ts';
import { validateQueryInput, validateQueryOutput, runHandlerSync } from './query-handler.ts';
import type { RuntimeQueryDefinition, QueryRuntimeRefs } from './query-handler.ts';

/**
 * Runs a query's `load` as the body of a subscription's reactive effect.
 *
 * Unlike {@link runLoadBody}, this is invoked synchronously inside an `effect()`, so the external
 * signals the load reads in its synchronous prefix are tracked — when they later change, the effect
 * re-runs and the load re-fires, turning it into a reactive async resource. Loads are therefore an
 * idempotent warming step (the documented guideline, now a hard contract); one-shot side effects
 * belong in a command.
 *
 * Writes go through gated commands: if `isCurrent()` flips to false because a newer run started
 * (deps changed again), this run's later writes are dropped, so a slow stale load cannot clobber the
 * newer result. Sibling reads use the default queries — their loads fire-and-forget — so transitive
 * dependencies stay warm without the `.loaded()` drain, which is only meaningful for awaited pulls.
 */
async function runReactiveLoad<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>,
  validatedInput: unknown,
  isCurrent: () => boolean
): Promise<void> {
  if (!queryDef.load) {
    return;
  }

  const loadSelf: LoadSelf<TState> = {
    get state() {
      return refs.state;
    },
    // Reactive-load reads must keep dependency loads warm. `.get()` on a default query is a pure
    // read and never fires a load, so the body sees fire-and-forget wrappers instead: reading a
    // dependency triggers its load (deduped while in flight) without awaiting a drain.
    queries: refs.reactiveLoadQueries,
    commands: refs.buildGatedCommands(isCurrent) as LoadSelf<TState>['commands'],
  };
  const loadCtx: LoadCtx<TState> = { self: loadSelf, getService: refs.registryApi.getService };

  await Promise.resolve(queryDef.load(validatedInput, loadCtx));
}

/**
 * Subscribes to a query by running its handler inside a deep-signal-aware `computed()` and
 * notifying through an `effect()`. The callback receives a {@link QueryState} combining the current
 * `data` (the synchronous handler result, or the selected slice) with the per-subscription `load`
 * lifecycle (`status` / `loadStatus` / `error`).
 *
 * The first emission is **synchronous**: `subscribe()` invokes the callback once with the current
 * {@link QueryState} before it returns the unsubscribe handle. The runtime kicks `load` off in the
 * background but does not wait for it — subscribers see the current state immediately (a load-backed
 * query already reads `loading`, since the reactive-load effect runs synchronously here) and
 * follow-up emissions as the load settles (or re-fires) and tracked state changes.
 *
 * Three layers keep emissions precise:
 *
 * 1. **Fine-grained reads** — the handler (and the optional `selector`) read through the deep-signal
 *    proxy, so the computed only re-runs when the exact fields it touched change. A write to an
 *    unrelated key or field never re-runs the handler.
 * 2. **Lifecycle signal** — a separate per-subscription signal carries `status`/`loadStatus`/`error`,
 *    updated by the reactive-load effect. The emit effect reads both it and the data computed, so a
 *    status change (e.g. a background re-load) fires the callback even when the selected slice is
 *    unchanged.
 * 3. **Object dedup** — the whole emitted `QueryState` is compared with the previously emitted one via
 *    `isEqual`; a re-run that produces a deeply-equal state (e.g. a load rewriting an equal payload
 *    with no status change) does not fire the callback.
 *
 * Error sources all surface as `status: 'error'` (keeping the last successful `data`): input
 * validation failure, a synchronous handler / output-validation throw, and a `load` rejection.
 */
export function subscribeToQuery<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>,
  rawInput: unknown,
  selector: ((value: unknown) => unknown) | undefined,
  callback: (state: QueryState<unknown>) => void
): () => void {
  let active = true;

  let validatedInput: unknown;
  try {
    validatedInput = validateQueryInput(refs, queryName, queryDef, rawInput);
  } catch (error) {
    // Bad input is a programmer error, but surfacing it as an error state is more debuggable than
    // a silently dead subscription. The subscription still "exists", reporting the failure.
    callback(
      buildQueryState(undefined, { status: 'error', error: toError(error), loadStatus: 'idle' })
    );
    return () => {
      active = false;
    };
  }

  // Per-subscription lifecycle. A query with no `load` has nothing to load, so it starts (and
  // stays) `success`/`idle` unless its synchronous handler throws; a query with a `load` starts
  // `pending` and flips to `loading` as soon as the reactive-load effect fires below.
  const lifecycle = signal<QueryLifecycle>({
    status: queryDef.load ? 'pending' : 'success',
    error: undefined,
    loadStatus: 'idle',
  });

  let loadTeardown: (() => void) | undefined;
  if (queryDef.load) {
    // Reactive load: run the load inside an effect so the external signals it reads synchronously
    // are tracked. When they change, the effect re-runs and the load re-fires, keeping an
    // asynchronously-produced value fresh. `epoch` gates writes so a superseded run can't clobber
    // a newer one (the lifecycle updates below are gated the same way). Loads with no external
    // synchronous reads (the existing ones) track nothing and therefore fire exactly once. Because
    // this effect runs synchronously now, the first emission already reads `loading`.
    let epoch = 0;
    loadTeardown = effect(() => {
      const myEpoch = ++epoch;
      const isCurrent = () => myEpoch === epoch;

      // Mark this run in flight, preserving the current `status` (so the first load reads
      // `pending` → `isInitialLoading`, while a re-load over existing data reads `success` →
      // `isRefreshing`). Read untracked so the load effect does not depend on its own writes.
      const previous = untracked(() => lifecycle.value);
      lifecycle.value = {
        status: previous.status,
        error: previous.error,
        loadStatus: 'loading',
      };

      runReactiveLoad(refs, queryName, queryDef, validatedInput, isCurrent).then(
        () => {
          if (!isCurrent()) {
            return;
          }
          lifecycle.value = { status: 'success', error: undefined, loadStatus: 'idle' };
        },
        (error) => {
          if (!isCurrent()) {
            return;
          }
          lifecycle.value = { status: 'error', error: toError(error), loadStatus: 'idle' };
        }
      );
    });
  }

  // The output is always validated, but the computed's dependency footprint must match only what
  // the subscriber consumes:
  //   - With a `selector`, validation runs untracked (so reading the whole value to validate it
  //     does not register dependencies), and only the selected fields the selector reads are
  //     tracked. A sibling field the selector ignores never re-runs this computed.
  //   - Without a selector, validation runs tracked: reading the whole value is the correct
  //     footprint for a whole-output subscriber, and the validated value is emitted (identical to
  //     what a direct `.get()` / `.loaded()` pull returns).
  const comp = computed(() => {
    const output = runHandlerSync(
      refs,
      queryName,
      queryDef,
      validatedInput,
      refs.defaultQueries,
      refs.registryApi.getService
    );
    if (selector) {
      const validated = untracked(() => validateQueryOutput(refs, queryName, queryDef, output));
      // Read the live handler output so the selector's field accesses stay on the reactive
      // proxy; validation returns a plain parsed value that cannot carry those dependencies.
      selector(output);
      return detachSnapshot(selector(validated));
    }
    return detachSnapshot(validateQueryOutput(refs, queryName, queryDef, output));
  });

  let hasEmitted = false;
  let lastEmitted: QueryState<unknown> | undefined;
  // Last successfully produced `data`, retained so an error (load rejection or handler throw)
  // keeps the most recent good value visible instead of dropping it.
  let lastData: unknown;
  // Creating the effect runs it synchronously, so the first callback fires before `subscribe`
  // returns its unsubscribe handle.
  const teardown = effect(() => {
    // Read the lifecycle first so a status-only change (e.g. a background re-load over an
    // unchanged selected slice) still re-runs this effect and re-emits.
    const life = lifecycle.value;

    let data: unknown;
    let status = life.status;
    let error = life.error;
    try {
      data = comp.value;
      lastData = data;
    } catch (handlerError) {
      // A synchronous handler / output-validation throw becomes an error state while keeping the
      // last good data; this also covers no-`load` queries whose handler throws.
      data = lastData;
      status = 'error';
      error = toError(handlerError);
    }

    if (!active) {
      return;
    }

    const state = buildQueryState(data, { status, error, loadStatus: life.loadStatus });

    // Skip re-runs that produced a deeply-equal state (data and lifecycle both unchanged).
    if (hasEmitted && isEqual(state, lastEmitted)) {
      return;
    }

    hasEmitted = true;
    lastEmitted = state;
    callback(state);
  });

  return () => {
    active = false;
    teardown();
    loadTeardown?.();
  };
}
