import type { DocgenPayload } from '@aussieljk/forkbook/internal/types';

import { type QueryState } from '@aussieljk/forkbook/open-service';
import { getService } from '@aussieljk/forkbook/preview-api';

import { useQuerySubscription } from './use-query-subscription.ts';

/**
 * Subscribes docs blocks to the preview's local `core/docgen` runtime.
 *
 * Returns the full {@link QueryState} — `data` plus the load lifecycle (`isInitialLoading`,
 * `isError`, etc.) — so blocks can show a loading skeleton or error state instead of rendering
 * nothing while docgen resolves. `data` mirrors the query's output (a {@link DocgenPayload}, or
 * `undefined` when nothing has been extracted for the id yet).
 *
 * Requires a concrete component id and a registered `core/docgen` service. Callers whose service may
 * be absent (e.g. behind `docgenServer`) must guard at a parent and conditionally render
 * a child that calls this hook. The React 16/17-safe subscription mechanics live in
 * {@link useQuerySubscription}.
 */
export function useServiceDocgen(id: string): QueryState<DocgenPayload | undefined> {
  const service = getService('core/docgen', { internal: true });
  return useQuerySubscription(id, service.queries.docgen, { id });
}
