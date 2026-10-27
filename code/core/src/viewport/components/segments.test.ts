import { describe, expect, it } from 'vitest';

import { INITIAL_VIEWPORTS, MINIMAL_VIEWPORTS } from '../defaults.ts';
import { mapSegments } from './segments.ts';

describe('mapSegments', () => {
  it('maps the minimal viewports by type', () => {
    expect(mapSegments(MINIMAL_VIEWPORTS)).toEqual({
      segments: { mobile: 'mobile1', tablet: 'tablet', desktop: 'desktop' },
      overflow: ['mobile2'],
    });
  });

  it('puts the other viewports in the overflow list', () => {
    const { segments, overflow } = mapSegments(INITIAL_VIEWPORTS);
    expect(segments.mobile).toBe('iphone5');
    expect(overflow).not.toContain('iphone5');
    expect(overflow).toHaveLength(
      Object.keys(INITIAL_VIEWPORTS).length - Object.keys(segments).length
    );
  });

  it('uses the name when there is no type, and hides a segment with no match', () => {
    expect(
      mapSegments({
        small: { name: 'Small phone', styles: { width: '320px', height: '568px' } },
        watch: { name: 'Watch', styles: { width: '200px', height: '200px' }, type: 'watch' },
      })
    ).toEqual({ segments: { mobile: 'small' }, overflow: ['watch'] });
  });
});
