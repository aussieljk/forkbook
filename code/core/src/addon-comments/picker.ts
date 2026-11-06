import { getCssSelector, getTextSnippet } from './selector.ts';
import type { CommentElement } from './types.ts';

const OVERLAY_ID = 'forkbook-comments-picker-overlay';

/**
 * Lets the user pick one element in a document. It shows an outline on the element under the
 * pointer. A click picks the element and Escape stops. Returns a function that stops the picker.
 */
export function startPicker(
  doc: Document,
  onPick: (element: CommentElement) => void,
  onEnd: () => void
): () => void {
  const overlay = doc.createElement('div');
  overlay.id = OVERLAY_ID;
  Object.assign(overlay.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483647',
    outline: '2px solid #ff4785',
    background: 'rgba(255, 71, 133, 0.12)',
    display: 'none',
  });
  doc.body.appendChild(overlay);
  const previousCursor = doc.body.style.cursor;
  doc.body.style.cursor = 'crosshair';

  const onMove = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target || target === overlay || !target.getBoundingClientRect) {
      return;
    }
    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, {
      display: 'block',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  };

  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as Element | null;
    stop();
    if (target) {
      onPick({ selector: getCssSelector(target), text: getTextSnippet(target) });
    }
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      stop();
      onEnd();
    }
  };

  // Stop the other mouse events too, so the story does not react while the user picks.
  const block = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  doc.addEventListener('mousemove', onMove, true);
  doc.addEventListener('click', onClick, true);
  doc.addEventListener('mousedown', block, true);
  doc.addEventListener('mouseup', block, true);
  doc.addEventListener('keydown', onKey, true);

  let stopped = false;
  function stop() {
    if (stopped) {
      return;
    }
    stopped = true;
    doc.removeEventListener('mousemove', onMove, true);
    doc.removeEventListener('click', onClick, true);
    doc.removeEventListener('mousedown', block, true);
    doc.removeEventListener('mouseup', block, true);
    doc.removeEventListener('keydown', onKey, true);
    overlay.remove();
    doc.body.style.cursor = previousCursor;
  }

  return stop;
}
