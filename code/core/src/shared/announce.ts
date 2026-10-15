/**
 * A small screen reader announcer. It keeps one visually hidden live region per politeness level
 * at the end of the document body, and puts each message in it for a short time.
 */
export type Politeness = 'polite' | 'assertive';

const MESSAGE_TIMEOUT = 7000;

const regions = new Map<Politeness, HTMLElement>();

function getRegion(politeness: Politeness) {
  let region = regions.get(politeness);
  if (!region?.isConnected) {
    region = document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('role', 'log');
    region.setAttribute('aria-relevant', 'additions');
    region.dataset.liveAnnouncer = 'true';
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      margin: '-1px',
      padding: '0',
      border: '0',
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap',
    });
    document.body.append(region);
    regions.set(politeness, region);
  }
  return region;
}

/** Announces a message to screen readers. */
export function announce(message: string, politeness: Politeness = 'polite') {
  if (typeof document === 'undefined') {
    return;
  }
  const node = document.createElement('div');
  node.textContent = message;
  getRegion(politeness).append(node);
  setTimeout(() => node.remove(), MESSAGE_TIMEOUT);
}

/** Removes all messages of one politeness level. */
export function clearAnnouncer(politeness: Politeness) {
  regions.get(politeness)?.replaceChildren();
}

/** Removes the live regions from the document. Use it to reset state between tests. */
export function destroyAnnouncer() {
  regions.forEach((region) => region.remove());
  regions.clear();
}
