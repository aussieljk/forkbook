import { describe, expect, it } from 'vitest';

import { thumbnailSrc } from './root-page.ts';

describe('thumbnailSrc', () => {
  it('adds the base path to a local thumbnail', () => {
    expect(thumbnailSrc('thumbnails/src/button.png', '')).toBe('/thumbnails/src/button.png');
    expect(thumbnailSrc('thumbnails/src/button.png', '/sb')).toBe('/sb/thumbnails/src/button.png');
  });

  it('keeps URLs', () => {
    expect(thumbnailSrc('https://example.com/a.png', '/sb')).toBe('https://example.com/a.png');
    expect(thumbnailSrc('/logo.png', '/sb')).toBe('/logo.png');
    expect(thumbnailSrc('data:image/png;base64,AA', '/sb')).toBe('data:image/png;base64,AA');
  });
});
