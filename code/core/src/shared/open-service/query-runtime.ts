/**
 * # query-runtime
 *
 * The query surface for one registered service: `.get()`, `.loaded()`, and `.subscribe()`, the
 * in-flight load registry, and the `.loaded()` drain loop. `service-runtime.ts` assembles the rest
 * of the runtime (state signal, commands, static loader).
 *
 * ## Mental model in one paragraph
 *
 * `query.get(input)` is a synchronous, pure read: it validates input, calls the handler against
 * current state, and returns the result immediately. It does **not** fire the query's `load` — a
 * read never starts background work. Loads fire only through `query.subscribe(...)` (reactively,
 * re-firing as tracked state changes) and `query.loaded(input)` (the "wait until fully loaded"
 * form). `.loaded()` must guarantee that **every dependency the handler transitively reads is
 * settled** before returning, even though those dependencies are not declared statically anywhere.
 * The drain machinery in this file provides that guarantee. When a handler or load
 * body reads a *dependency* via `.get()` inside a `.loaded()` drain or a load body, that read still
 * triggers and awaits the dependency's load; a bare consumer `.get()` does not.
 *
 * ## Dependency-tracking algorithm
 *
 * `.loaded()` runs a *drain loop*:
 *
 * 1. Fire this query's own `load` and put the promise into a `LoadedSession` collector.
 * 2. Repeat:
 *    - Await everything currently in the collector with `Promise.allSettled`.
 *    - Mark those load keys as `settled` for the session.
 *    - Run the sync handler under the session as a *discovery pass*. Every sync read of a
 *      dependency query (via `ctx.self.queries.*` or `ctx.getService(...).queries.*`) consults
 *      the module-scoped `activeHandlerLoadSession`; if that dep's load is not already
 *      settled or on the ancestor chain, its promise is added to the collector.
 *    - If the discovery pass added new entries, loop again. Otherwise, exit.
 * 3. Final handler call (no session) returns the validated output.
 *
 * Inside a `load` body, `ctx.self.queries.*` are *wrapped* by {@link buildLoadWrappedQueries} so
 * the same registration happens against a load-local collector — the load promise only resolves
 * when its body **and** its own dependencies have settled. This propagates the "wait" through
 * async load bodies without needing AsyncLocalStorage.
 *
 * ## Why each piece exists
 *
 * - **{@link inFlightLoads}** dedups concurrent calls for the same `(runtime, service, query,
 *   input)` so two consumers asking for the same data share one load.
 * - **{@link LoadedSession.ancestorChain}** breaks cycles: a dep whose load key is already on the
 *   call chain is skipped (not added to any collector) so two queries that read each other do
 *   not self-deadlock.
 * - **{@link LoadedSession.settledKeys}** prevents the discovery loop from refiring already
 *   completed loads on each iteration — without it, every reread of a dep in the handler would
 *   re-trigger its load and the drain loop would never converge.
 * - **{@link MAX_DRAIN_ITERATIONS}** caps pathological cases (e.g. a handler reading a query with
 *   an ever-changing input key) so a buggy service surfaces a real error instead of hanging.
 *
 * ## Boundaries
 *
 * Cross-service `getService(...).queries.*` calls **inside a load body** are intentionally not
 * tracked into the load-local collector. Authors who need cross-service deps awaited from inside
 * a load should call `.loaded()` explicitly (e.g. `await ctx.getService(id).queries.foo
 * .loaded(input)`). Cross-service calls from a sync handler still go through the session-aware
 * path because handler reads are tracked by `activeHandlerLoadSession`, which is module-scoped
 * and stable for the duration of a sync handler call.
 */
import { OpenServiceLoadedDrainExceededError } from '../../server-errors.ts';
import { rethrowAsync } from './service-validation.ts';
import type { LoadCtx, LoadSelf, Query, QueryState } from './types.ts';
import {
  MAX_DRAIN_ITERATIONS,
  inFlightLoads,
  EMPTY_SET,
  makeInFlightKey,
  makeLoadKey,
  surfaceRejections,
  drainCollector,
} from './query-load-registry.ts';
import type { CollectorEntry } from './query-load-registry.ts';
import {
  validateQueryInput,
  validateQueryOutput,
  runHandlerSync,
  createQueryGet,
} from './query-handler.ts';
import type { RuntimeQueryDefinition, RuntimeQuery, QueryRuntimeRefs } from './query-handler.ts';
import { subscribeToQuery } from './query-subscribe.ts';

/**
 * State shared by every sync handler call inside one `.loaded()` invocation.
 *
 * The session tracks the set of load keys that are ancestors in the call chain (for cycle
 * detection), the loads collected during this iteration (waiting to be drained), and the load
 * keys that have already settled in this session so re-running the handler does not refire them.
 */
type LoadedSession = {
  ancestorChain: ReadonlySet<string>;
  collector: Set<CollectorEntry>;
  settledKeys: Set<string>;
};

/**
 * Active session for `.loaded()` while a sync handler is being re-run for dependency discovery.
 *
 * Default query functions consult this variable to know whether to register their load promise
 * into a caller-owned collector. Sync handlers don't `await`, so the variable is stable for the
 * duration of one handler call and can safely live at module scope.
 */
let activeHandlerLoadSession: LoadedSession | undefined;

/**
 * Triggers a `load` if one is not already in flight for the same key, or returns the existing
 * promise so concurrent callers share the work.
 *
 * Returns the in-flight promise (whether newly created or reused). The body runs through
 * {@link runLoadBody} and its promise is registered into {@link inFlightLoads} **before** that
 * body starts; see the "register before run" comment below for why.
 *
 * ### Ancestor chain
 *
 * The parent caller passes its own ancestor chain (the load keys it is currently nested
 * inside). This function extends that chain with the dependency's own key before kicking off the
 * body, so any transitive read of an ancestor — e.g. `a.load` calls `b.load` which calls `a.load`
 * again — short-circuits via cycle detection in {@link createDefaultQuery} and
 * {@link buildLoadWrappedQueries}, rather than deadlocking on its own ancestor's promise.
 *
 * ### Cycle example
 *
 * Service exposes queries `a` and `b`; `a.load` reads `b`, `b.load` reads `a`.
 *
 * 1. `a.loaded()` → `triggerLoad(a, parentChain={})` → body runs with chain `{a}`.
 * 2. `a.load` body calls `ctx.self.queries.b.get(...)` → wrapper calls
 *    `triggerLoad(b, parentChain={a})` → body runs with chain `{a, b}`.
 * 3. `b.load` body calls `ctx.self.queries.a.get(...)` → wrapper calls
 *    `triggerLoad(a, parentChain={a, b})`. `a` is already in flight, so the existing promise is
 *    reused. But the wrapper sees `aKey ∈ ancestorChain` and **skips** adding it to b's local
 *    collector — `b` does not wait on `a`'s promise.
 * 4. Both load bodies progress past their sync reads, await their commands, settle.
 */
function triggerLoad<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>,
  validatedInput: unknown,
  loadKey: string,
  parentAncestorChain: ReadonlySet<string>
): Promise<unknown> {
  const inFlightKey = makeInFlightKey(refs.loadScopeId, loadKey);
  const existing = inFlightLoads.get(inFlightKey);
  if (existing) {
    return existing;
  }

  const extendedChain = new Set(parentAncestorChain);
  extendedChain.add(loadKey);

  // Register the promise into `inFlightLoads` BEFORE the load body starts so any reentrant query
  // call made inside the body's synchronous prefix (the part before the body's first `await`)
  // sees this load as in-flight and reuses the same promise instead of starting a duplicate run.
  // The body itself is wrapped in `Promise.resolve().then(...)` to enforce a microtask boundary
  // between registration and execution, which guarantees this ordering even if `runLoadBody`
  // happened to be synchronous up to its first await.
  const promise = Promise.resolve()
    .then(() => runLoadBody(refs, queryName, queryDef, validatedInput, extendedChain))
    .finally(() => {
      // Only clear the entry if it still points at this promise — another caller may have already
      // overwritten it with a fresh in-flight load for the next round.
      if (inFlightLoads.get(inFlightKey) === promise) {
        inFlightLoads.delete(inFlightKey);
      }
    });

  inFlightLoads.set(inFlightKey, promise);
  return promise;
}

/**
 * Executes one `load` invocation with its own local collector and a wrapped `self`.
 *
 * Each `load` invocation gets its **own** collector and its **own** map of wrapped queries. This
 * matters because the wrappers close over the collector and ancestor chain that belong to this
 * particular load — a different load running concurrently for a different key has a different
 * collector and a different chain, so the same `defaultQuery` cannot serve both.
 *
 * The wrapper around `self.queries` registers transitively triggered loads into the local
 * collector. After the user's load body resolves, we still await that collector via
 * {@link drainCollector} so the returned promise only resolves once every dependency the load
 * body touched has also settled. That is what gives `.loaded()` its transitive guarantee through
 * async load bodies: an outer caller awaiting this load promise is, by construction, also
 * waiting for all descendant loads triggered by self.queries reads.
 *
 * Cross-service `ctx.getService(id).queries.*` calls are intentionally **not** wrapped — that
 * would require recursively wrapping the registry's runtime services and would entangle load
 * scoping across service boundaries. Authors must use `.loaded()` explicitly when they need a
 * cross-service dependency awaited from inside a load body.
 */
export async function runLoadBody<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>,
  validatedInput: unknown,
  ancestorChain: ReadonlySet<string>
): Promise<void> {
  if (!queryDef.load) {
    return;
  }

  const collector = new Set<CollectorEntry>();
  const wrappedQueries = buildLoadWrappedQueries(refs, ancestorChain, collector);
  const loadSelf: LoadSelf<TState> = {
    get state() {
      return refs.state;
    },
    queries: wrappedQueries,
    commands: refs.getLoadCommands() as LoadSelf<TState>['commands'],
  };
  const loadCtx: LoadCtx<TState> = { self: loadSelf, getService: refs.registryApi.getService };

  await Promise.resolve(queryDef.load(validatedInput, loadCtx));
  await drainCollector(collector, undefined, refs.serviceId, queryName);
}

/**
 * Builds the `ctx.self.queries` map used inside a *reactive subscription load* body.
 *
 * `.get()` here fires the dependency's `load` fire-and-forget (deduped via {@link inFlightLoads}),
 * scoped to the reactive-load context only, so a plain consumer `.get()` stays a pure read. There is no drain: a subscription
 * does not await its dependencies, it re-fires reactively when their tracked state changes.
 */
export function buildReactiveLoadQueries<TState>(
  refs: QueryRuntimeRefs<TState>
): Record<string, Query<unknown, unknown>> {
  const wrappedQueries: Record<string, Query<unknown, unknown>> = {};

  for (const [name, queryDef] of refs.queryDefinitions) {
    const defaultQuery = refs.defaultQueries[name] as RuntimeQuery;
    // Fire-and-forget: reading a dependency warms its load (deduped while in flight) but the
    // reactive load never awaits it — there is no collector and no ancestor chain to extend.
    const get = createQueryGet(refs, name, queryDef, wrappedQueries, (validatedInput) => {
      const loadKey = makeLoadKey(refs.serviceId, name, validatedInput);
      triggerLoad(refs, name, queryDef, validatedInput, loadKey, EMPTY_SET).catch(rethrowAsync);
    });

    wrappedQueries[name] = {
      get,
      loaded: defaultQuery.loaded,
      subscribe: defaultQuery.subscribe,
    } as RuntimeQuery;
  }

  return wrappedQueries;
}

/**
 * Builds the wrapped `self.queries` map exposed inside one load body.
 *
 * The returned map shadows the runtime's default query map. Each wrapped call still validates
 * input, fires the dependency's `load` via {@link triggerLoad}, and runs the same sync handler —
 * but it also **registers the dependency's load promise into the load-local collector** so
 * `runLoadBody`'s drain can await it before returning. The wrappers therefore turn an ordinary
 * sync read of a dependency into "fire load + remember it for the outer drain to wait on."
 *
 * ### Why one map per load invocation?
 *
 * Two separate `load` calls (different keys, possibly different services) have different
 * `ancestorChain` sets and different `collector` instances. Each wrapped function closes over
 * those values, so the maps cannot be reused — they are recreated cheaply per invocation. Inside
 * a single load body, all nested handler reads share **this same** wrapped map (the closure
 * captures `wrappedQueries` from this scope), so transitive dependency reads continue to register
 * against the same collector.
 *
 * ### Cycle detection
 *
 * If the dependency's load key is already on this load's ancestor chain, we still call
 * `triggerLoad` (it returns the in-flight promise) but we **skip** adding it to the collector.
 * Adding it would deadlock: the outer load's drain would wait on its own ancestor's promise,
 * which is itself waiting on this load. See {@link triggerLoad}'s walkthrough for a concrete
 * `a → b → a` example.
 *
 * ### `.loaded()` and `.subscribe` on the wrapped queries
 *
 * `.loaded()` on a wrapped query forwards the **current** ancestor chain so a load body author
 * can write `await ctx.self.queries.foo.loaded(input)` and trust that the resulting drain
 * inherits the right cycle-protection set. `.subscribe` is passed through unchanged because
 * subscriptions are never part of a load drain — they have their own lifecycle.
 */
function buildLoadWrappedQueries<TState>(
  refs: QueryRuntimeRefs<TState>,
  ancestorChain: ReadonlySet<string>,
  collector: Set<CollectorEntry>
): Record<string, Query<unknown, unknown>> {
  const wrappedQueries: Record<string, Query<unknown, unknown>> = {};

  for (const [name, queryDef] of refs.queryDefinitions) {
    const defaultQuery = refs.defaultQueries[name] as RuntimeQuery;
    // Fire the dependency's load and register it into this load body's collector so the outer
    // `runLoadBody` drain awaits it — unless the key is already on the ancestor chain, in which case
    // adding it would deadlock the drain on its own ancestor (see `triggerLoad`'s cycle walkthrough).
    const get = createQueryGet(refs, name, queryDef, wrappedQueries, (validatedInput) => {
      const loadKey = makeLoadKey(refs.serviceId, name, validatedInput);
      const promise = triggerLoad(refs, name, queryDef, validatedInput, loadKey, ancestorChain);
      if (!ancestorChain.has(loadKey)) {
        collector.add({ key: loadKey, promise });
      }
    });

    const wrapped = {
      get,
      loaded(input?: unknown) {
        return runLoaded(
          refs,
          name,
          queryDef,
          arguments.length === 0 ? undefined : input,
          ancestorChain
        ) as Promise<unknown>;
      },
      subscribe: defaultQuery.subscribe,
    } as RuntimeQuery;

    wrappedQueries[name] = wrapped;
  }

  return wrappedQueries;
}

/**
 * Implements `query.loaded(input)`.
 *
 * Returns a promise that resolves to the validated handler output once this query's `load` and
 * every dependency the handler transitively reads has settled.
 *
 * ### Algorithm
 *
 * 1. **Setup** — validate input, build the session (`ancestorChain` extended with this load key,
 *    an empty `collector`, an empty `settledKeys`). The ancestor chain inherits from
 *    `parentAncestorChain` when this is called from inside a wrapped query (so the inner
 *    `.loaded()` shares cycle protection with the outer load body).
 *
 * 2. **Fire own load** — if this query has a `load` hook, push its in-flight promise into
 *    `session.collector`. Skip if the key is already on the parent's ancestor chain (we are
 *    inside that load already; we cannot deadlock on ourselves).
 *
 * 3. **Drain + discover loop**, up to {@link MAX_DRAIN_ITERATIONS} times:
 *    - Inner loop: while `session.collector` has entries, snapshot them, clear, await with
 *      `Promise.allSettled`, mark their keys in `session.settledKeys`, surface rejections.
 *    - Run the handler synchronously under `activeHandlerLoadSession = session` (a discovery
 *      pass). Sync reads of dependencies inside the handler go through {@link createDefaultQuery}
 *      and register any non-settled, non-ancestor load into `session.collector`.
 *    - If the handler threw, swallow (state might still be partial; a later iteration may fix it).
 *    - If the handler added nothing to the collector, we have converged — exit the loop.
 *
 * 4. **Return** — run the handler one final time under the same session (so dependency reads
 *    respect `settledKeys` and do not refire loads) and return the validated output. This is the
 *    value the caller sees. If state is still incomplete at this point the handler may throw, and
 *    that throw propagates.
 *
 * ### Worked example: `bar.loaded(input)` where `bar.handler` reads `foo`
 *
 * Assume `bar` has no `load` of its own; `foo` does.
 *
 * - **Setup**: session = `{ ancestorChain: {barKey}, collector: ∅, settledKeys: ∅ }`. No own load
 *   to fire (`bar.load` is undefined).
 * - **Iteration 1**:
 *   - Inner drain: collector is empty, skip.
 *   - Discovery pass: handler runs, reads `ctx.self.queries.foo.get(...)`. The default `foo` query
 *     sees `activeHandlerLoadSession === session`, sees that `fooKey` is neither in
 *     `ancestorChain` nor in `settledKeys`, and fires + registers foo's load into
 *     `session.collector`. The handler returns (possibly with stale state).
 *   - `hasMoreWork = true` (collector now has one entry).
 * - **Iteration 2**:
 *   - Inner drain: `await Promise.allSettled([fooPromise])`, mark `fooKey` settled, surface any
 *     rejection.
 *   - Discovery pass: handler runs again. The default `foo` query is now in `settledKeys`, so
 *     it fires nothing and the collector stays empty.
 *   - `hasMoreWork = false`; exit.
 * - **Final**: run handler once more (state is now populated by foo's load), validate, return.
 *
 * The same machinery handles deeper chains — every settled load may have populated state that
 * causes the handler to read **more** queries on the next iteration. The loop keeps draining
 * until the read set stabilizes.
 */
async function runLoaded<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>,
  rawInput: unknown,
  parentAncestorChain: ReadonlySet<string> = EMPTY_SET
): Promise<unknown> {
  const validatedInput = validateQueryInput(refs, queryName, queryDef, rawInput);
  const loadKey = makeLoadKey(refs.serviceId, queryName, validatedInput);
  const ancestorChain = new Set<string>(parentAncestorChain);
  ancestorChain.add(loadKey);

  const session: LoadedSession = {
    ancestorChain,
    collector: new Set<CollectorEntry>(),
    settledKeys: new Set<string>(),
  };

  if (queryDef.load && !parentAncestorChain.has(loadKey)) {
    const promise = triggerLoad(
      refs,
      queryName,
      queryDef,
      validatedInput,
      loadKey,
      parentAncestorChain
    );
    session.collector.add({ key: loadKey, promise });
  }

  let iterations = 0;
  let hasMoreWork = true;

  // Always run at least one discovery pass even when this query has no `load` of its own — the
  // handler may still call other queries whose loads need to be awaited.
  while (hasMoreWork) {
    if (iterations++ > MAX_DRAIN_ITERATIONS) {
      throw new OpenServiceLoadedDrainExceededError({
        serviceId: refs.serviceId,
        name: queryName,
        iterations: MAX_DRAIN_ITERATIONS,
      });
    }

    while (session.collector.size > 0) {
      const pending = [...session.collector];
      session.collector.clear();

      const settlements = await Promise.allSettled(pending.map((entry) => entry.promise));

      // Mark keys as settled before surfacing rejections so the discovery pass below does not
      // refire them even when the very first load failed.
      for (const entry of pending) {
        session.settledKeys.add(entry.key);
      }

      surfaceRejections(settlements);
    }

    // Discovery: run the handler under the session so each sync read of a dependency that is not
    // settled yet (and not on the ancestor chain) gets registered into the session collector.
    const previousSession = activeHandlerLoadSession;
    activeHandlerLoadSession = session;

    try {
      runHandlerSync(
        refs,
        queryName,
        queryDef,
        validatedInput,
        refs.defaultQueries,
        refs.registryApi.getService
      );
    } catch {
      // Handlers may throw when state isn't fully populated yet; the next drain iteration may fix
      // it. The final post-loop handler call propagates any persistent failure.
    } finally {
      activeHandlerLoadSession = previousSession;
    }

    hasMoreWork = session.collector.size > 0;
  }

  // Run the final handler call under the session so already-settled dependency loads are not
  // refired during this last evaluation, and validate the output at this pull boundary (validation
  // is intentionally kept out of the reactive `runHandlerSync` path).
  const previousSession = activeHandlerLoadSession;
  activeHandlerLoadSession = session;

  try {
    return validateQueryOutput(
      refs,
      queryName,
      queryDef,
      runHandlerSync(
        refs,
        queryName,
        queryDef,
        validatedInput,
        refs.defaultQueries,
        refs.registryApi.getService
      )
    );
  } finally {
    activeHandlerLoadSession = previousSession;
  }
}

/**
 * Creates the default query object exposed on the service runtime as `service.queries.foo`.
 *
 * The returned object is what consumers use directly **and** what handlers see in
 * `ctx.self.queries.foo` (load bodies see a different, wrapped version — see
 * {@link buildLoadWrappedQueries}). Its surface:
 *
 * - **`get(input)`** validates input synchronously, runs the handler against current state, and
 *   returns the validated result. It does **not** fire this query's `load` for an ordinary consumer
 *   read. The one exception is dependency tracking: when a `.get()` runs inside a `.loaded()`
 *   discovery pass (`activeHandlerLoadSession` set), it fires + registers the load into the session
 *   collector so the outer drain awaits it (skipping cycles and already-settled keys). Reactive
 *   subscription loads warm dependencies through {@link buildReactiveLoadQueries} instead.
 * - **`loaded(input)`** drives the full `.loaded()` drain.
 * - **`subscribe(...)`** sets up a reactive subscription (this is what fires the reactive `load`).
 */
function createDefaultQuery<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>
): RuntimeQuery {
  const resolveInput = (input: unknown, argsLength: number) =>
    argsLength === 0 ? undefined : input;

  // A bare consumer `.get()` never fires the load. The only firing path is a `.loaded()` discovery
  // pass: when one is active (`activeHandlerLoadSession` set), register this dependency's load into
  // the session collector so the outer drain awaits it — skipping keys on the ancestor chain (cycle)
  // or already settled this session.
  const get = createQueryGet(refs, queryName, queryDef, refs.defaultQueries, (validatedInput) => {
    const session = activeHandlerLoadSession;
    if (!session) {
      return;
    }
    const loadKey = makeLoadKey(refs.serviceId, queryName, validatedInput);
    if (!session.ancestorChain.has(loadKey) && !session.settledKeys.has(loadKey)) {
      const promise = triggerLoad(
        refs,
        queryName,
        queryDef,
        validatedInput,
        loadKey,
        session.ancestorChain
      );
      session.collector.add({ key: loadKey, promise });
    }
  });

  const subscribe = ((...args: unknown[]): (() => void) => {
    if (args.length === 1 && typeof args[0] === 'function') {
      return subscribeToQuery(
        refs,
        queryName,
        queryDef,
        undefined,
        undefined,
        args[0] as (state: QueryState<unknown>) => void
      );
    }

    if (args.length === 2 && typeof args[0] === 'function' && typeof args[1] === 'function') {
      return subscribeToQuery(
        refs,
        queryName,
        queryDef,
        undefined,
        args[0] as (value: unknown) => unknown,
        args[1] as (state: QueryState<unknown>) => void
      );
    }

    const [input, selectorOrCallback, maybeCallback] = args;

    return subscribeToQuery(
      refs,
      queryName,
      queryDef,
      input,
      maybeCallback ? (selectorOrCallback as (value: unknown) => unknown) : undefined,
      (maybeCallback ?? selectorOrCallback) as (state: QueryState<unknown>) => void
    );
  }) as RuntimeQuery['subscribe'];

  return {
    get,
    loaded(input?: unknown) {
      return runLoaded(refs, queryName, queryDef, resolveInput(input, arguments.length));
    },
    subscribe,
  } as RuntimeQuery;
}

/** Builds the runtime query map for one service runtime. */
export function buildQueries<TState>(
  refs: QueryRuntimeRefs<TState>
): Record<string, Query<unknown, unknown>> {
  const result: Record<string, Query<unknown, unknown>> = {};

  for (const [name, queryDef] of refs.queryDefinitions) {
    result[name] = createDefaultQuery(refs, name, queryDef);
  }

  return result;
}

export {
  inFlightLoads,
  makeInFlightKey,
  makeLoadKey,
  nextLoadScopeId,
} from './query-load-registry.ts';
export type { QueryRuntimeRefs, RuntimeQueryDefinition } from './query-handler.ts';
