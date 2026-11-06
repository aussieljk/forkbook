import { describe, expect, it } from 'vitest';

import { getStorySortParameter } from './get-story-sort-parameter.ts';

type Comparator = (a: { id: string }, b: { id: string }) => number;

describe('getStorySortParameter', () => {
  it('returns undefined when there is no storySort', () => {
    expect(getStorySortParameter(undefined)).toBeUndefined();
    expect(getStorySortParameter('export default { parameters: {} };')).toBeUndefined();
  });

  it('reads the object form', () => {
    expect(
      getStorySortParameter(`
        const preview = { parameters: { options: { storySort: { method: 'alphabetical', order: ['Intro', ['A', '*']] } } } };
        export default preview;
      `)
    ).toEqual({ method: 'alphabetical', order: ['Intro', ['A', '*']] });
  });

  it('reads definePreview', () => {
    expect(
      getStorySortParameter(`
        import { definePreview } from '@aussieljk/forkbook/react-vite';
        export default definePreview({ parameters: { options: { storySort: { order: ['B'] } } } });
      `)
    ).toEqual({ order: ['B'] });
  });

  it('evaluates a TypeScript arrow function', () => {
    const sort = getStorySortParameter(`
      import type { Preview } from '@aussieljk/forkbook/react-vite';
      const preview: Preview = {
        parameters: { options: { storySort: (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, undefined, { numeric: true }) } },
      };
      export default preview;
    `) as Comparator;
    expect(typeof sort).toBe('function');
    expect(sort({ id: 'a2' }, { id: 'a10' })).toBeLessThan(0);
  });

  it('evaluates an object method', () => {
    const sort = getStorySortParameter(`
      export default { parameters: { options: { storySort(a, b) { return b.id.localeCompare(a.id); } } } };
    `) as Comparator;
    expect(sort({ id: 'a' }, { id: 'b' })).toBeGreaterThan(0);
  });
});
