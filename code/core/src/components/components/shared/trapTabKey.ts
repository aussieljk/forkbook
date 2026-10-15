const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Returns the visible elements in a container that Tab can move to, in document order. */
export const getTabbables = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (element) =>
      element.getClientRects().length > 0 && !element.hasAttribute('data-base-ui-focus-guard')
  );

/**
 * Keeps Tab and Shift+Tab inside a container: from the last tabbable element, Tab goes to the first
 * one, and from the first, Shift+Tab goes to the last one. Call it from a keydown handler.
 */
export function trapTabKey(event: KeyboardEvent, container: HTMLElement) {
  // Ignore keys that a nested trap already handled. React events also bubble through portals, so
  // ignore keys from a nested overlay too.
  if (event.key !== 'Tab' || event.defaultPrevented || !container.contains(event.target as Node)) {
    return;
  }
  const tabbables = getTabbables(container);
  const first = tabbables[0];
  const last = tabbables[tabbables.length - 1];
  if (!first) {
    event.preventDefault();
  } else if (event.shiftKey && event.target === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && event.target === last) {
    event.preventDefault();
    first.focus();
  }
}
