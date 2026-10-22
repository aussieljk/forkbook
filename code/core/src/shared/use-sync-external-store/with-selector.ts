/**
 * ESM port of `use-sync-external-store/with-selector` (React, MIT licence).
 *
 * The package from npm is CommonJS. The build aliases `use-sync-external-store/shim/with-selector`
 * and `use-sync-external-store/with-selector` to this file (see
 * `scripts/build/utils/generate-bundle.ts`).
 */
import { useDebugValue, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: undefined | null | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean
): Selection {
  const instRef = useRef<{ hasValue: boolean; value: Selection | null } | null>(null);
  if (instRef.current === null) {
    instRef.current = { hasValue: false, value: null };
  }
  const inst = instRef.current;

  const [getSelection, getServerSelection] = useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot: Snapshot;
    let memoizedSelection: Selection;
    const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        const nextSelection = selector(nextSnapshot);
        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value as Selection;
          if (isEqual(currentSelection, nextSelection)) {
            return (memoizedSelection = currentSelection);
          }
        }
        return (memoizedSelection = nextSelection);
      }
      const currentSelection = memoizedSelection;
      if (Object.is(memoizedSnapshot, nextSnapshot)) {
        return currentSelection;
      }
      const nextSelection = selector(nextSnapshot);
      if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return currentSelection;
      }
      memoizedSnapshot = nextSnapshot;
      return (memoizedSelection = nextSelection);
    };
    return [
      () => memoizedSelector(getSnapshot()),
      getServerSnapshot == null ? undefined : () => memoizedSelector(getServerSnapshot()),
    ] as const;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSnapshot, getServerSnapshot, selector, isEqual]);

  const value = useSyncExternalStore(subscribe, getSelection, getServerSelection);
  useEffect(() => {
    inst.hasValue = true;
    inst.value = value;
  }, [value]);
  useDebugValue(value);
  return value;
}
