import React, { type ReactNode, useCallback, useRef, useState } from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';
import { REVIEW_STATUS_TYPE_ID } from '@aussieljk/forkbook/internal/types';

import { global } from '../../../shared/global.ts';
import { SearchIcon, XIcon } from 'lucide-react';

import type { DownshiftState, StateChangeOptions } from 'downshift';
import Downshift from 'downshift';
import type { FuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';
import { useStorybookApi } from '@aussieljk/forkbook/manager-api';

import { useLandmark } from '../../hooks/useLandmark.ts';
import { getGroupStatus, getMostCriticalStatusValue } from '../../utils/status.tsx';
import { scrollIntoView, searchItem } from '../../utils/tree.ts';
import { useLayout } from '../layout/LayoutProvider.tsx';
import { DEFAULT_REF_ID } from './Sidebar.tsx';
import type {
  CombinedDataset,
  DownshiftItem,
  SearchChildrenFn,
  SearchItem,
  SearchResult,
  Selection,
} from './types.ts';
import { isExpandType, isSearchResult } from './types.ts';
import styles from './Search.module.css';

const { document } = global;

const DEFAULT_MAX_SEARCH_RESULTS = 50;

const options = {
  shouldSort: true,
  tokenize: true,
  findAllMatches: true,
  includeScore: true,
  includeMatches: true,
  threshold: 0.2,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    { name: 'name', weight: 0.6 },
    { name: 'path', weight: 0.3 },
    { name: 'anchors.title', weight: 0.1 },
  ],
} as FuseOptions<SearchItem>;

export type SearchProps = {
  children: SearchChildrenFn;
  dataset: CombinedDataset;
  enableShortcuts?: boolean;
  getLastViewed: () => Selection[];
  initialQuery?: string;
  searchFieldContent?: ReactNode;
  belowSearchContent?: ReactNode;
};

export const Search = React.memo<SearchProps>(function Search({
  children,
  dataset,
  enableShortcuts = true,
  getLastViewed,
  initialQuery = '',
  searchFieldContent,
  belowSearchContent,
}) {
  const api = useStorybookApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputPlaceholder, setPlaceholder] = useState('Find components');
  const [allComponents, showAllComponents] = useState(false);

  const makeFuse = useCallback(() => {
    const list: SearchItem[] = [];

    for (const [refId, { index, allStatuses }] of dataset.entries) {
      if (!index) {
        continue;
      }

      const groupStatus = getGroupStatus(index || {}, allStatuses ?? {});
      const datasetValues = Object.values(index);

      for (const datasetValue of datasetValues) {
        const storyStatuses = allStatuses?.[datasetValue.id];
        const mostCriticalStatusValue = storyStatuses
          ? getMostCriticalStatusValue(
              Object.values(storyStatuses)
                .filter((status) => status.typeId !== REVIEW_STATUS_TYPE_ID)
                .map((status) => status.value)
            )
          : null;

        const status = mostCriticalStatusValue ?? groupStatus[datasetValue.id] ?? null;

        if (datasetValue.type !== 'docs' || !globalThis?.FEATURES?.experimentalSearchDocsHeadings) {
          list.push({
            ...searchItem(datasetValue, dataset.hash[refId]),
            status,
          });
          continue;
        }

        const { anchors, ...baseSearchItem } = searchItem(datasetValue, dataset.hash[refId]);

        list.push({
          ...baseSearchItem,
          status,
        });

        anchors?.forEach((anchor) => {
          const namePostfix = baseSearchItem.path?.[0] === anchor.title ? '' : ` / ${anchor.title}`;

          list.push({
            ...baseSearchItem,
            anchors: [anchor],
            // Fuse requires unique ids, so suffix the entry id with the anchor's DOM id
            id: `${datasetValue.id}#${anchor.id}`,
            name: `${datasetValue.name}${namePostfix}`,
            status,
          });
        });
      }
    }

    return new Fuse(list, options);
  }, [dataset]);

  const getResults = useCallback(
    (input: string) => {
      const fuse = makeFuse();

      if (!input) {
        return [];
      }

      let results: DownshiftItem[] = [];
      const resultIds: Set<string> = new Set();

      const allMatches = (fuse.search(input) as SearchResult[]).filter(({ item }) => {
        return item.type === 'component' || item.type === 'docs' || item.type === 'story';
      });

      // When the index is being created, we have a legacy piece of logic that
      // wraps every docs page inside a component entry. This originates from
      // Forkbook 6 and has never been removed. Because of it, we must dedupe
      // docs entries that are hidden under a fake component entry.
      // See https://github.com/storybookjs/storybook/issues/35513 for details.
      const docsParentIds = new Set<string>();
      allMatches.forEach(({ item }) => {
        if (item.type === 'docs' && item.parent) {
          docsParentIds.add(item.parent);
        }
      });

      // Components suppressed in favor of a matching docs child that hasn't been rendered yet.
      // The suppressed component still occupies its slot in `resultIds` so that sibling stories
      // ranked between the component and its docs entry are deduplicated, as they were before.
      const pendingDocsReplacements = new Set<string>();

      const distinctResults = allMatches.filter(({ item }) => {
        // This always gets called before the corresponding docs item
        // because of the sorting performed by the search index. So it's
        // safe to use `pendingDocsReplacements` in a single-pass lookup.
        if (item.type === 'component' && docsParentIds.has(item.id)) {
          if (!resultIds.has(item.id)) {
            resultIds.add(item.id);
            pendingDocsReplacements.add(item.id);
          }
          return false;
        }

        // When we reach this, we know we found an unattached MDX page with
        // a synthetic docs wrapper. Like in Tree.tsx, remove the wrapper
        // and present the docs item to end users.
        if (item.type === 'docs' && item.parent && pendingDocsReplacements.has(item.parent)) {
          pendingDocsReplacements.delete(item.parent);
          resultIds.add(item.id);
          return true;
        }
        // @ts-expect-error (non strict)
        if (resultIds.has(item.parent)) {
          return false;
        }
        resultIds.add(item.id);
        if (item.type === 'docs' && item.parent) {
          resultIds.add(item.parent);
        }
        return true;
      });

      if (distinctResults.length) {
        results = distinctResults.slice(0, allComponents ? 1000 : DEFAULT_MAX_SEARCH_RESULTS);
        if (distinctResults.length > DEFAULT_MAX_SEARCH_RESULTS && !allComponents) {
          results.push({
            showAll: () => showAllComponents(true),
            totalCount: distinctResults.length,
            moreCount: distinctResults.length - DEFAULT_MAX_SEARCH_RESULTS,
          });
        }
      }

      return results;
    },
    [allComponents, makeFuse]
  );

  const onSelect = useCallback(
    (selectedItem: DownshiftItem | null) => {
      if (!selectedItem) {
        return;
      }
      if (isSearchResult(selectedItem)) {
        const { id: rawId, refId } = selectedItem.item;
        const [storyId, anchor] = rawId.split('#');

        api?.selectStory(storyId, undefined, {
          // @ts-expect-error (non strict)
          ref: refId !== DEFAULT_REF_ID && refId,
          scrollTo: anchor,
        });

        // @ts-expect-error (non strict)
        inputRef.current.blur();
        showAllComponents(false);
        return;
      }
      if (isExpandType(selectedItem)) {
        selectedItem.showAll();
      }
    },
    [api]
  );

  const onInputValueChange = useCallback((inputValue: string, stateAndHelpers: any) => {
    showAllComponents(false);
  }, []);

  const stateReducer = useCallback(
    (state: DownshiftState<DownshiftItem>, changes: StateChangeOptions<DownshiftItem>) => {
      switch (changes.type) {
        case Downshift.stateChangeTypes.blurInput: {
          return {
            ...changes,
            // Prevent clearing the input on blur
            inputValue: state.inputValue,
            // Return to the tree view after selecting an item
            isOpen: !!state.inputValue && !state.selectedItem,
          };
        }

        case Downshift.stateChangeTypes.mouseUp: {
          // Prevent clearing the input on refocus
          return state;
        }

        case Downshift.stateChangeTypes.keyDownEscape: {
          if (state.inputValue) {
            // Clear the inputValue, but don't return to the tree view
            return { ...changes, inputValue: '', isOpen: true, selectedItem: null };
          }
          // When pressing escape a second time return to the tree view
          // The onKeyDown handler will also blur the input in this case
          return { ...changes, isOpen: false, selectedItem: null };
        }

        case Downshift.stateChangeTypes.clickItem:
        case Downshift.stateChangeTypes.keyDownEnter: {
          if (isSearchResult(changes.selectedItem)) {
            // Return to the tree view, but keep the input value
            return { ...changes, inputValue: state.inputValue };
          }
          if (isExpandType(changes.selectedItem)) {
            // Downshift should completely ignore this
            return state;
          }
          return changes;
        }

        default:
          return changes;
      }
    },
    []
  );
  const { isMobile } = useLayout();

  const searchLandmarkRef = useRef<HTMLDivElement>(null);
  const { landmarkProps } = useLandmark({ role: 'search' }, searchLandmarkRef);

  return (
    <Downshift<DownshiftItem>
      initialInputValue={initialQuery}
      stateReducer={stateReducer}
      // @ts-expect-error (Converted from ts-ignore)
      itemToString={(result) => result?.item?.name || ''}
      scrollIntoView={(e) => scrollIntoView(e)}
      onSelect={onSelect}
      onInputValueChange={onInputValueChange}
    >
      {({
        isOpen,
        openMenu,
        closeMenu,
        inputValue,
        getInputProps,
        getItemProps,
        getLabelProps,
        getMenuProps,
        getRootProps,
        highlightedIndex,
        reset,
      }) => {
        const input = inputValue ? inputValue.trim() : '';
        let results: DownshiftItem[] = input ? getResults(input) : [];

        const lastViewed = !input && getLastViewed();
        if (lastViewed && lastViewed.length) {
          // @ts-expect-error (non strict)
          results = lastViewed.reduce((acc, { storyId, refId, anchor }) => {
            const data = dataset.hash[refId];
            if (data && data.index && data.index[storyId]) {
              const story = data.index[storyId];
              const item = story.type === 'story' ? data.index[story.parent] : story;
              const entryId = anchor ? `${item.id}#${anchor}` : item.id;
              // prevent duplicates
              // @ts-expect-error (non strict)
              if (!acc.some((res) => res.item.refId === refId && res.item.id === entryId)) {
                const baseItem = searchItem(item, dataset.hash[refId]);
                let resultItem = baseItem;
                if (anchor && item.type === 'docs') {
                  const matchingAnchor = item.anchors?.find((a) => a.id === anchor);
                  if (matchingAnchor) {
                    const namePostfix =
                      baseItem.path?.[0] === matchingAnchor.title
                        ? ''
                        : ` / ${matchingAnchor.title}`;
                    resultItem = {
                      ...baseItem,
                      id: entryId,
                      name: `${item.name}${namePostfix}`,
                    };
                  }
                }
                // @ts-expect-error (non strict)
                acc.push({ item: resultItem, matches: [], score: 0 });
              }
            }
            return acc;
          }, []);
        }

        const inputId = 'storybook-explorer-searchfield';
        const inputProps = getInputProps({
          id: inputId,
          ref: inputRef,
          required: true,
          type: 'search',
          placeholder: inputPlaceholder,
          onFocus: () => {
            openMenu();
            setPlaceholder('Type to find...');
          },
          onBlur: () => setPlaceholder('Find components'),
          onKeyDown: (e) => {
            // @ts-expect-error (non strict)
            if (e.key === 'Escape' && inputValue.length === 0) {
              // When pressing escape while the input is empty, blur the input
              // The stateReducer will handle returning to the tree view
              // @ts-expect-error (non strict)
              inputRef.current.blur();
            }
          },
        });

        const labelProps = getLabelProps({
          htmlFor: inputId,
        });

        return (
          <>
            <label className={styles.screenReaderLabel} {...labelProps}>
              Search for components
            </label>
            <div className={styles.searchBar} ref={searchLandmarkRef} {...landmarkProps}>
              <div
                {...getRootProps({ refKey: '' }, { suppressRefError: true })}
                data-mobile={isMobile || undefined}
                className={`search-field ${styles.searchField}`}
              >
                <div className={styles.iconWrapper}>
                  <SearchIcon />
                </div>
                <input
                  className={styles.input}
                  {...inputProps}
                  data-mobile={isMobile || undefined}
                />
                <div className={styles.actions}>
                  {input && (
                    <Button
                      padding="small"
                      variant="ghost"
                      ariaLabel="Clear search"
                      onClick={() => {
                        reset({ inputValue: '' });
                        closeMenu();
                        inputRef.current?.focus();
                      }}
                    >
                      <XIcon />
                    </Button>
                  )}
                  {searchFieldContent}
                </div>
              </div>
            </div>
            {!isOpen && belowSearchContent}
            <div className={styles.focusContainer} tabIndex={0} id="storybook-explorer-menu">
              {children({
                query: input,
                results,
                isNavVisible: !isOpen && document.activeElement !== inputRef.current,
                isNavReachable: !isOpen || input.length === 0,
                isSearchResultRendered: isOpen,
                closeMenu,
                getMenuProps,
                getItemProps,
                highlightedIndex,
              })}
            </div>
          </>
        );
      }}
    </Downshift>
  );
});
