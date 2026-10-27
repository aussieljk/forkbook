import { describe, expect, it } from 'vitest';

import type { IndexEntry } from '../types/modules/indexer.ts';
import { groupEntriesByComponent } from './story-grid.ts';

const story = (id: string, title: string, extra: Partial<IndexEntry> = {}): IndexEntry =>
  ({
    type: 'story',
    subtype: 'story',
    id,
    title,
    name: id.split('--')[1],
    importPath: `./src/${title}.stories.tsx`,
    ...extra,
  }) as IndexEntry;

const docs = (id: string, title: string, extra: Partial<IndexEntry> = {}): IndexEntry =>
  ({
    type: 'docs',
    id,
    title,
    name: 'Docs',
    importPath: `./src/${title}.mdx`,
    storiesImports: [],
    ...extra,
  }) as IndexEntry;

describe('groupEntriesByComponent', () => {
  it('groups entries by title, in index order', () => {
    const result = groupEntriesByComponent([
      story('example-button--primary', 'Example/Button'),
      story('example-header--logged-in', 'Example/Header'),
      story('example-button--secondary', 'Example/Button'),
    ]);
    expect(result.map((c) => c.title)).toEqual(['Example/Button', 'Example/Header']);
    expect(result[0]).toMatchObject({
      name: 'Button',
      entryId: 'example-button--primary',
      viewMode: 'story',
      firstStoryId: 'example-button--primary',
      storyIds: ['example-button--primary', 'example-button--secondary'],
    });
  });

  it('opens the docs entry when there is one', () => {
    const [button] = groupEntriesByComponent([
      story('button--primary', 'Button'),
      docs('button--docs', 'Button'),
    ]);
    expect(button).toMatchObject({ name: 'Button', entryId: 'button--docs', viewMode: 'docs' });
    expect(button.storyIds).toEqual(['button--primary']);
  });

  it('gives a docs-only component no stories', () => {
    const [intro] = groupEntriesByComponent([docs('intro--docs', 'Intro')]);
    expect(intro).toMatchObject({ entryId: 'intro--docs', storyIds: [] });
    expect(intro.firstStoryId).toBeUndefined();
  });

  it('leaves out test stories and the hidden file', () => {
    const result = groupEntriesByComponent(
      [
        story('a--one', 'A', { subtype: 'test' } as Partial<IndexEntry>),
        docs('home--docs', 'Home', { importPath: './.forkbook/Home.mdx' }),
        story('b--one', 'B'),
      ],
      { hiddenImportPath: './.forkbook/Home.mdx' }
    );
    expect(result.map((c) => c.title)).toEqual(['B']);
  });

  it('uses the thumbnail of the first story, else of the docs entry', () => {
    const [a, b] = groupEntriesByComponent([
      docs('a--docs', 'A', { thumbnail: 'docs.png' }),
      story('a--one', 'A', { thumbnail: 'one.png' }),
      story('a--two', 'A', { thumbnail: 'two.png' }),
      docs('b--docs', 'B', { thumbnail: 'b.png' }),
      story('b--one', 'B'),
    ]);
    expect(a.thumbnail).toBe('one.png');
    expect(b.thumbnail).toBe('b.png');
  });
});
