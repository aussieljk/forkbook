import { type AriaRole, type HTMLAttributes, type RefObject, useEffect } from 'react';

interface LandmarkProps {
  role: AriaRole;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/** The element that had focus last in each landmark, so F6 can bring the user back to it. */
const lastFocused = new WeakMap<HTMLElement, HTMLElement>();

const isNavigable = (landmark: HTMLElement) =>
  landmark.getClientRects().length > 0 && !landmark.closest('[aria-hidden="true"], [inert]');

function focusLandmark(landmark: HTMLElement) {
  const previous = lastFocused.get(landmark);
  if (previous?.isConnected && landmark.contains(previous)) {
    previous.focus();
    return;
  }
  if (!landmark.hasAttribute('tabindex')) {
    landmark.tabIndex = -1;
  }
  landmark.focus();
}

/** F6 moves focus to the next landmark and Shift+F6 to the previous one, in document order. */
function onKeyDown(event: KeyboardEvent) {
  if (
    event.key !== 'F6' ||
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }
  const landmarks = Array.from(document.querySelectorAll<HTMLElement>('[data-fb-landmark]')).filter(
    isNavigable
  );
  if (landmarks.length === 0) {
    return;
  }

  const active = document.activeElement;
  // Landmarks can nest, so take the innermost (last) landmark that holds the focus.
  const current = landmarks.reduce(
    (found, landmark, index) => (landmark.contains(active) ? index : found),
    -1
  );
  const step = event.shiftKey ? -1 : 1;
  const next = current === -1 ? (event.shiftKey ? landmarks.length - 1 : 0) : current + step;

  event.preventDefault();
  focusLandmark(landmarks[(next + landmarks.length) % landmarks.length]);
}

let isInstalled = false;

/**
 * Makes an element a landmark: it gets its ARIA role and label, and users can move between
 * landmarks with F6 and Shift+F6. The `data-fb-landmark` attribute lets us highlight the landmark
 * that receives focus (see useLandmarkIndicator).
 */
export function useLandmark(props: LandmarkProps, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isInstalled) {
      isInstalled = true;
      // Capture phase, so focus has moved before useLandmarkIndicator looks for it.
      document.addEventListener('keydown', onKeyDown, { capture: true });
    }

    const element = ref.current;
    if (!element) {
      return;
    }
    const remember = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && event.target !== element) {
        lastFocused.set(element, event.target);
      }
    };
    element.addEventListener('focusin', remember);
    return () => element.removeEventListener('focusin', remember);
  }, [ref]);

  const landmarkProps: HTMLAttributes<HTMLElement> & { 'data-fb-landmark': true } = {
    ...props,
    'data-fb-landmark': true,
  };
  return { landmarkProps };
}
