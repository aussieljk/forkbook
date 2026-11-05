/** Runs a query handler synchronously: input and output validation, and the `.get()` read. */

import { OpenServiceUnimplementedOperationError } from '../../server-errors.ts';
import { validateSchemaSync } from './service-validation.ts';
import type {
  AnySchema,
  CommandSelf,
  Query,
  QueryCtx,
  QueryDefinition,
  QuerySelf,
  ServiceId,
  ServiceRegistryApi,
} from './types.ts';

export type RuntimeQueryDefinition<TState> = QueryDefinition<TState, AnySchema, AnySchema>;

/** The runtime's concrete query object, with input/output erased to `unknown`. */
export type RuntimeQuery = Query<unknown, unknown>;

/**
 * Captures the per-runtime data needed by query helpers that operate across multiple queries.
 *
 * Bundling the references lets `createDefaultQuery`, the load body wrapper, and `.loaded()` share
 * the same closure shape without each one re-deriving the per-service callbacks.
 */
export type QueryRuntimeRefs<TState> = {
  serviceId: ServiceId;
  /**
   * Process-local token used to scope {@link inFlightLoads}.
   *
   * A load body writes through the `self` of the runtime it started on, so a load in flight on one
   * runtime says nothing about another runtime's state. The static build stands up a throwaway
   * runtime per snapshot next to the live registry's runtime, which is where the two meet.
   */
  loadScopeId: string;
  /** Deep reactive proxy backing this service's state; reads inside a computed track fine-grained. */
  state: TState;
  registryApi: ServiceRegistryApi;
  queryDefinitions: Map<string, RuntimeQueryDefinition<TState>>;
  defaultQueries: Record<string, Query<unknown, unknown>>;
  /**
   * Fire-and-forget query wrappers used inside reactive subscription load bodies so reading a
   * dependency keeps its load warm. Populated once the default queries exist (see
   * {@link buildReactiveLoadQueries}).
   */
  reactiveLoadQueries: Record<string, Query<unknown, unknown>>;
  /**
   * Returns the command map load bodies should call. After the runtime is wired to the channel this
   * is the channel-routed map, so a load can invoke a peer-implemented (remote) command; before that
   * (and in channel-free contexts like the static build) it is the raw local map.
   */
  getLoadCommands: () => CommandSelf<TState>['commands'];
  /**
   * Builds a command map whose `setState` writes are dropped once `isCurrent()` returns false.
   * Used by reactive subscription loads so a superseded (stale) re-run cannot overwrite the state
   * produced by a newer run. Remote commands are routed through the channel map unchanged, since they
   * carry no local `setState` to gate.
   */
  buildGatedCommands: (isCurrent: () => boolean) => CommandSelf<TState>['commands'];
};

/**
 * Validates query input synchronously, falling through to the dedicated async-schema error if a
 * schema returns a Promise.
 */
export function validateQueryInput<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>,
  input: unknown
): unknown {
  return validateSchemaSync(queryDef.input, input, {
    kind: 'query',
    serviceId: refs.serviceId,
    name: queryName,
    phase: 'input',
  });
}

export function validateQueryOutput<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>,
  output: unknown
): unknown {
  return validateSchemaSync(queryDef.output, output, {
    kind: 'query',
    serviceId: refs.serviceId,
    name: queryName,
    phase: 'output',
  });
}

/**
 * Runs the query handler synchronously and returns its raw result (no output validation).
 *
 * The `selfQueries` parameter lets the caller swap in load-aware wrappers when running inside a
 * load body or a `.loaded()` discovery pass; ordinary handler calls pass the default queries.
 */
export function runHandlerSync<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>,
  validatedInput: unknown,
  selfQueries: Record<string, Query<unknown, unknown>>,
  getService: ServiceRegistryApi['getService']
): unknown {
  if (!queryDef.handler) {
    throw new OpenServiceUnimplementedOperationError({
      kind: 'query',
      serviceId: refs.serviceId,
      name: queryName,
    });
  }

  const handlerSelf: QuerySelf<TState> = {
    get state() {
      return refs.state;
    },
    queries: selfQueries,
  };
  const handlerCtx: QueryCtx<TState> = { self: handlerSelf, getService };

  // The handler result is returned raw. Output validation is intentionally *not* run here: this
  // function executes inside the subscription `computed`, where reading the whole value to validate
  // it would broaden the reactive dependency footprint. Validation runs at the call sites instead —
  // see `validateQueryOutput` usages.
  return queryDef.handler(validatedInput, handlerCtx);
}

/**
 * Builds the shared synchronous `get(input)` for a query: validate input → fire the load per the
 * caller's policy → run the handler against `selfQueries` → validate output.
 *
 * The three query surfaces — the default consumer query ({@link createDefaultQuery}), the reactive
 * subscription-load wrappers ({@link buildReactiveLoadQueries}), and the awaited load-body wrappers
 * ({@link buildLoadWrappedQueries}) — differ only in (a) which `self.queries` map the handler sees
 * and (b) how a load-backed read fires its `load`. Everything else (the validate → run → validate
 * skeleton, the zero-arg input resolution) is identical, so each surface passes its own `selfQueries`
 * map and `fireLoad` policy and shares this body.
 *
 * `fireLoad` is invoked only for queries that declare a `load`; queries without one skip it. Pass
 * `selfQueries` by reference even when it is the same map being populated by the caller — `get`
 * closes over the reference, which is fully built by the time any handler runs.
 */
export function createQueryGet<TState>(
  refs: QueryRuntimeRefs<TState>,
  queryName: string,
  queryDef: RuntimeQueryDefinition<TState>,
  selfQueries: Record<string, Query<unknown, unknown>>,
  fireLoad: ((validatedInput: unknown) => void) | undefined
): (input?: unknown) => unknown {
  return function get(input?: unknown) {
    const validatedInput = validateQueryInput(
      refs,
      queryName,
      queryDef,
      arguments.length === 0 ? undefined : input
    );

    if (queryDef.load) {
      fireLoad?.(validatedInput);
    }

    // Validate the output on this pull boundary. Validation runs off the reactive path, so it never
    // affects the deep-signal dependency graph; the validated value is what the consumer receives.
    return validateQueryOutput(
      refs,
      queryName,
      queryDef,
      runHandlerSync(
        refs,
        queryName,
        queryDef,
        validatedInput,
        selfQueries,
        refs.registryApi.getService
      )
    );
  };
}
