import type { IndexEntry } from '../types/modules/indexer.ts';

/** One component on the start page: all index entries with the same title. */
export interface StoryGridComponent {
  /** The component title, for example `Example/Button`. */
  title: string;
  /** The last part of the title, for example `Button`. */
  name: string;
  /** The ID of the entry that the card opens: the docs page if there is one, else the first story. */
  entryId: string;
  /** The view mode of that entry. */
  viewMode: 'story' | 'docs';
  /** The first story. The card shows a live preview of it when there is no thumbnail. */
  firstStoryId?: string;
  /** The IDs of all stories, in index order. */
  storyIds: string[];
  /** The thumbnail of the first story (or of its meta), or of the docs entry. */
  thumbnail?: string;
}

/** True for entries that show in the grid and on the all stories page. */
const isGridEntry = (entry: IndexEntry, hiddenImportPath?: string) =>
  entry.importPath !== hiddenImportPath &&
  (entry.type === 'docs' || (entry.type === 'story' && entry.subtype !== 'test'));

/**
 * Groups index entries by component title, in index order. `hiddenImportPath` is a file to leave
 * out, for example the MDX file of the start page.
 */
export const groupEntriesByComponent = (
  entries: Iterable<IndexEntry>,
  { hiddenImportPath }: { hiddenImportPath?: string } = {}
): StoryGridComponent[] => {
  const byTitle = new Map<string, StoryGridComponent>();
  for (const entry of entries) {
    if (!isGridEntry(entry, hiddenImportPath)) {
      continue;
    }
    let component = byTitle.get(entry.title);
    if (!component) {
      component = {
        title: entry.title,
        name: entry.title.split('/').pop() ?? entry.title,
        entryId: entry.id,
        viewMode: entry.type,
        storyIds: [],
      };
      byTitle.set(entry.title, component);
    }
    if (entry.type === 'docs' && component.viewMode !== 'docs') {
      component.entryId = entry.id;
      component.viewMode = 'docs';
    }
    if (entry.type === 'story') {
      component.storyIds.push(entry.id);
      if (!component.firstStoryId) {
        component.firstStoryId = entry.id;
        component.thumbnail = entry.thumbnail ?? component.thumbnail;
      }
    } else {
      component.thumbnail ??= entry.thumbnail;
    }
  }
  return [...byTitle.values()];
};
