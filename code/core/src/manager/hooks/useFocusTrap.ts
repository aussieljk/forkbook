import { type RefObject, useEffect } from 'react';

import { getTabbables, trapTabKey } from '../../components/components/shared/trapTabKey.ts';

/**
 * Keeps keyboard focus inside an element while it is enabled. When enabled, it moves focus to the
 * first tabbable element. When disabled or unmounted, it gives focus back to the element that had
 * it before.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const container = ref.current;
    if (!enabled || !container) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    getTabbables(container)[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => trapTabKey(event, container);
    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [ref, enabled]);
}
