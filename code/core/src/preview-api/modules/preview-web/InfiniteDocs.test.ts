import { describe, expect, it } from 'vitest';

import type { IndexEntry } from '@aussieljk/forkbook/internal/types';

import { docsEntriesInOrder, nextDocsEntry } from './InfiniteDocs.ts';

const entry = (id: string, title: string, type: 'docs' | 'story' = 'docs') =>
  ({ id, title, type, name: 'Docs', importPath: `./${id}.mdx` }) as IndexEntry;

const entries = Object.fromEntries(
  [
    entry('addons-overview--docs', 'Addons/Overview'),
    entry('addons-links--docs', 'Addons/Links'),
    entry('button--primary', 'Button', 'story'),
    entry('faq--docs', 'FAQ'),
    entry('introduction--docs', 'Introduction'),
  ].map((e) => [e.id, e])
);

describe('docsEntriesInOrder', () => {
  it('gives top-level docs first, then the groups, as the sidebar shows them', () => {
    expect(docsEntriesInOrder(entries).map((e) => e.id)).toEqual([
      'faq--docs',
      'introduction--docs',
      'addons-overview--docs',
      'addons-links--docs',
    ]);
  });
});

describe('nextDocsEntry', () => {
  it('gives the next docs entry and skips stories', () => {
    expect(nextDocsEntry(entries, 'introduction--docs')?.id).toBe('addons-overview--docs');
  });

  it('gives undefined after the last docs entry or for an unknown id', () => {
    expect(nextDocsEntry(entries, 'addons-links--docs')).toBeUndefined();
    expect(nextDocsEntry(entries, 'missing--docs')).toBeUndefined();
  });
});
