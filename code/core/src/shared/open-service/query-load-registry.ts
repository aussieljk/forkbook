/** The in-flight load registry, load keys, and the collector drain used by `.loaded()` and load bodies. */

import { OpenServiceLoadedDrainExceededError } from '../../server-errors.ts';
import type { ServiceId } from './types.ts';

/** Max number of drain iterations before `.loaded()` gives up to avoid infinite oscillation. */
export const MAX_DRAIN_ITERATIONS = 32;

/**
 * One pending load promise plus the load key that identifies it for cycle and dedup checks.
 *
 * The key is stored alongside the promise so collectors can be drained and marked settled in one
 * pass without re-deriving the key from the promise after the fact.
 */
export type CollectorEntry = { key: string; promise: Promise<unknown> };

/**
 * Process-global registry of in-flight `load` promises keyed by
 * `${loadScopeId}::${serviceId}::${queryName}::${hash}`.
 *
 * The dedup is in-flight only: once a load settles, its entry is removed so a subsequent call can
 * refire it. The same registry is consulted by both same-service and cross-service callers so two
 * queries that depend on the same dependency share one load.
 *
 * The runtime scope is what keeps that sharing honest. A load body writes through the `self` of the
 * runtime it started on, so joining a load in flight on a different runtime would resolve against
 * state that load never wrote.
 */
export const inFlightLoads = new Map<string, Promise<unknown>>();

/**
 * Monotonic instance id for {@link makeInFlightKey}. The load key already names the service;
 * this token only has to be unique among live runtimes.
 */
let nextLoadScopeSequence = 0;

export const nextLoadScopeId = (): string => String((nextLoadScopeSequence += 1));

export const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Returns a deterministic JSON encoding so the same logical input always produces the same key.
 *
 * Object keys are sorted recursively so `{a:1, b:2}` and `{b:2, a:1}` hash identically. Inputs are
 * expected to be JSON-safe; non-serializable values like `Date`, `Map`, or functions fall back to
 * `JSON.stringify`'s defaults and may produce ambiguous keys.
 */
function stableHash(value: unknown): string {
  // Tag undefined and objects with a discriminator rather than substituting a sentinel string:
  // a bare sentinel (e.g. `'__undefined__'`) would alias an actual string input of the same value,
  // and the tag on objects keeps an object that happens to mirror the undefined marker distinct.
  // Sorting object keys makes `{a,b}` and `{b,a}` hash identically.
  const encode = (raw: unknown): unknown => {
    if (raw === undefined) {
      return { __t: 'undefined' };
    }
    if (raw === null || typeof raw !== 'object') {
      return raw;
    }
    if (Array.isArray(raw)) {
      return raw.map(encode);
    }
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(raw as Record<string, unknown>).sort()) {
      sorted[k] = encode((raw as Record<string, unknown>)[k]);
    }
    return { __t: 'object', value: sorted };
  };

  return JSON.stringify(encode(value));
}

/**
 * Scopes a load key to one runtime instance for {@link inFlightLoads}.
 *
 * The unscoped {@link makeLoadKey} stays the identity used for cycle detection and settled-key
 * bookkeeping, which are per-load-graph rather than per-runtime.
 */
export function makeInFlightKey(loadScopeId: string, loadKey: string): string {
  return `${loadScopeId}::${loadKey}`;
}

export function makeLoadKey(
  serviceId: ServiceId,
  queryName: string,
  validatedInput: unknown
): string {
  return `${serviceId}::${queryName}::${stableHash(validatedInput)}`;
}

/**
 * Surfaces the first rejected settlement as the thrown error, aggregating the rest under `cause`.
 *
 * Drainers use `Promise.allSettled` so one rejected dependency does not prevent siblings from
 * finishing their work; this helper preserves all rejections without losing the primary one.
 */
export function surfaceRejections(settlements: PromiseSettledResult<unknown>[]): void {
  const rejections = settlements.filter((s): s is PromiseRejectedResult => s.status === 'rejected');

  if (rejections.length === 0) {
    return;
  }

  const [first, ...rest] = rejections.map((r) => r.reason);

  if (rest.length > 0) {
    if (first instanceof Error) {
      const aggregated = Reflect.get(first, 'cause');

      if (aggregated === undefined) {
        try {
          Reflect.set(first, 'cause', { aggregated: rest });
        } catch {
          // Frozen errors keep their primary message; aggregated rejections are still observable
          // through the `rest` array if a caller decides to traverse it themselves.
        }
      }
    }
  }

  throw first;
}

/**
 * Drains a collector of pending load promises until no new entries appear.
 *
 * Each iteration snapshots the current entries, clears the collector, awaits them with
 * `Promise.allSettled`, marks their keys as settled (for caller bookkeeping), then loops if the
 * settled loads' bodies surfaced more entries. Caps at `MAX_DRAIN_ITERATIONS` to avoid hanging on
 * pathological oscillation.
 */
export async function drainCollector(
  collector: Set<CollectorEntry>,
  settledKeys: Set<string> | undefined,
  serviceId: ServiceId,
  queryName: string
): Promise<void> {
  let iterations = 0;

  while (collector.size > 0) {
    if (iterations++ > MAX_DRAIN_ITERATIONS) {
      throw new OpenServiceLoadedDrainExceededError({
        serviceId,
        name: queryName,
        iterations: MAX_DRAIN_ITERATIONS,
      });
    }

    const pending = [...collector];
    collector.clear();

    const settlements = await Promise.allSettled(pending.map((entry) => entry.promise));

    if (settledKeys) {
      // Mark keys as settled even for rejected loads so the discovery loop does not refire them.
      for (const entry of pending) {
        settledKeys.add(entry.key);
      }
    }

    surfaceRejections(settlements);
  }
}

/**
 * Detaches a value from the reactive deep-signal proxy into a plain snapshot.
 *
 * Used for `selector` results on the subscription path: a selector can return a live proxy slice,
 * which we strip so consumers get plain, comparable data (and reads inside the `computed` register
 * only the fields the selector actually touched). Primitives pass through untouched.
 *
 * `structuredClone` cannot clone a `Proxy`, so this uses a JSON round-trip. That is sufficient
 * because open-service state is required to be JSON-serializable (the same constraint the
 * static-build pipeline relies on). For plain (already-detached) values such as the whole-state
 * snapshot, the runtime uses `structuredClone` directly instead.
 */
export function detachSnapshot<TValue>(value: TValue): TValue {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as TValue;
}
