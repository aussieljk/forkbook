import type { ViewportMap } from '../types.ts';

export type SegmentKind = 'mobile' | 'tablet' | 'desktop';

export const SEGMENT_KINDS: SegmentKind[] = ['mobile', 'tablet', 'desktop'];

const NAME_PATTERNS: Record<SegmentKind, RegExp> = {
  mobile: /mobile|phone/i,
  tablet: /tablet|ipad/i,
  desktop: /desktop|laptop/i,
};

/**
 * Finds the viewport for each segment. A viewport with the same type wins. If there is none, a
 * viewport with a name that agrees with the segment is used. Each viewport goes to one segment
 * only. The viewports that no segment uses go into the overflow list.
 */
export const mapSegments = (viewports: ViewportMap) => {
  const keys = Object.keys(viewports);
  const used = new Set<string>();
  const segments: Partial<Record<SegmentKind, string>> = {};

  const pick = (kind: SegmentKind, test: (key: string) => boolean) => {
    if (segments[kind]) {
      return;
    }
    const key = keys.find((k) => !used.has(k) && test(k));
    if (key) {
      segments[kind] = key;
      used.add(key);
    }
  };

  for (const kind of SEGMENT_KINDS) {
    pick(kind, (k) => viewports[k].type === kind);
  }
  for (const kind of SEGMENT_KINDS) {
    pick(kind, (k) => NAME_PATTERNS[kind].test(`${k} ${viewports[k].name}`));
  }

  return { segments, overflow: keys.filter((k) => !used.has(k)) };
};
