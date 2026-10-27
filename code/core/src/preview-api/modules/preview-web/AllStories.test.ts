import { describe, expect, it } from 'vitest';

import { isAllStoriesMode } from './AllStories.ts';

describe('isAllStoriesMode', () => {
  it('is true only for `allStories=true`', () => {
    expect(isAllStoriesMode({ search: '?allStories=true' })).toBe(true);
    expect(isAllStoriesMode({ search: '?id=a--b&allStories=true' })).toBe(true);
    expect(isAllStoriesMode({ search: '?allStories=false' })).toBe(false);
    expect(isAllStoriesMode({ search: '?id=a--b' })).toBe(false);
  });
});
