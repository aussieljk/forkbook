import type { FC } from 'react';
import React, { useContext, useMemo } from 'react';

import { StoryGrid as StoryGridView } from '@aussieljk/forkbook/internal/components';
import { SELECT_STORY } from '@aussieljk/forkbook/internal/core-events';
import type { DocsContextProps, IndexEntry, StoryIndex } from '@aussieljk/forkbook/internal/types';

import { buildStoryPathMap, toUrlPath } from '../../../router/story-paths.ts';
import type { RootPageGlobal } from '../../../shared/root-page.ts';
import { type StoryGridComponent, groupEntriesByComponent } from '../../../shared/story-grid.ts';
import { getStoryHref } from '../getStoryHref.ts';
import { DocsContext } from './DocsContext.ts';

export interface StoryGridProps {
  /** Show only components with a title that starts with one of these prefixes. */
  include?: string[];
  /** Hide components with a title that starts with one of these prefixes. */
  exclude?: string[];
}

/** The index entries of the preview store. The docs context keeps the store as a protected field. */
const indexEntries = (context: DocsContextProps): IndexEntry[] => {
  const store = (context as unknown as { store?: { storyIndex?: StoryIndex } }).store;
  return Object.values(store?.storyIndex?.entries ?? {});
};

/** The start page settings. The manager has them; the preview reads them from the top window. */
const rootPage = (): RootPageGlobal | undefined => {
  const own = (globalThis as { FORKBOOK_ROOT?: RootPageGlobal }).FORKBOOK_ROOT;
  if (own) {
    return own;
  }
  try {
    return (window.top as { FORKBOOK_ROOT?: RootPageGlobal } | null)?.FORKBOOK_ROOT;
  } catch {
    // The top window is on another origin.
    return undefined;
  }
};

const matchesPrefix = (title: string, prefixes: string[]) =>
  prefixes.some((prefix) => title === prefix || title.startsWith(prefix.replace(/\/?$/, '/')));

/** Filters components by title prefix. */
export const filterComponents = (
  components: StoryGridComponent[],
  { include, exclude }: StoryGridProps
) =>
  components.filter(
    (component) =>
      (!include?.length || matchesPrefix(component.title, include)) &&
      !(exclude?.length && matchesPrefix(component.title, exclude))
  );

/**
 * A grid of cards, one for each component, for an MDX page. It is the same grid as the start page.
 * A card opens the component in the manager.
 */
export const StoryGrid: FC<StoryGridProps> = ({ include, exclude }) => {
  const context = useContext(DocsContext);
  const entries = indexEntries(context);

  const components = useMemo(
    () =>
      filterComponents(
        groupEntriesByComponent(entries, { hiddenImportPath: rootPage()?.mdxImportPath }),
        { include, exclude }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries.length, include?.join('\n'), exclude?.join('\n')]
  );
  const pathMap = useMemo(
    () => buildStoryPathMap(entries), // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries.length]
  );

  return (
    <div className="sb-unstyled">
      <StoryGridView
        components={components}
        getHref={(component) =>
          // The preview iframe is in the manager root folder, so a relative tree URL works.
          `./${toUrlPath(`/${component.viewMode}/${component.entryId}`, pathMap).slice(1)}`
        }
        onSelect={(component) =>
          context.channel.emit(SELECT_STORY, {
            storyId: component.entryId,
            viewMode: component.viewMode,
          })
        }
        getPreviewSrc={(storyId) => getStoryHref(storyId, { viewMode: 'story', embed: 'true' })}
      />
    </div>
  );
};
