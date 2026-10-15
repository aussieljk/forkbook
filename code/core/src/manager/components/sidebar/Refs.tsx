import type { FC, MutableRefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useStorybookApi, useStorybookState } from '@aussieljk/forkbook/manager-api';

import { getActiveFilterCount } from '../../../shared/utils/story-index-filters.ts';
import { getStateType } from '../../utils/tree.ts';
import { AuthBlock, EmptyBlock, ErrorBlock, LoaderBlock } from './RefBlocks.tsx';
import { RefIndicator } from './RefIndicator.tsx';
import { DEFAULT_REF_ID } from './Sidebar.tsx';
import { Tree } from './Tree.tsx';
import { CollapseIcon } from './components/CollapseIcon.tsx';
import type { Highlight, RefType } from './types.ts';
import styles from './Refs.module.css';

export interface RefProps {
  isLoading: boolean;
  isBrowsing: boolean;
  hasEntries: boolean;
  selectedStoryId: string | null;
  highlightedRef: MutableRefObject<Highlight>;
  setHighlighted: (highlight: Highlight) => void;
}

export const Ref: FC<RefType & RefProps> = React.memo(function Ref(props) {
  const storybookState = useStorybookState();
  const api = useStorybookApi();
  const {
    filteredIndex: index,
    id: refId,
    title = refId,
    isLoading: isLoadingMain,
    isBrowsing,
    hasEntries,
    selectedStoryId,
    highlightedRef,
    setHighlighted,
    loginUrl,
    type,
    expanded = true,
    indexError,
    previewInitialized,
    allStatuses,
  } = props;

  const length = useMemo(() => (index ? Object.keys(index).length : 0), [index]);
  const indicatorRef = useRef(null);

  const isMain = refId === DEFAULT_REF_ID;
  const isLoadingInjected =
    (type === 'auto-inject' && !previewInitialized) || type === 'server-checked';
  const isLoading = isLoadingMain || isLoadingInjected || type === 'unknown';
  const isError = !!indexError;
  const isEmpty = !isLoading && length === 0;
  const isAuthRequired = !!loginUrl && length === 0;
  const activeFilterCount = getActiveFilterCount(storybookState);

  const state = getStateType(isLoading, isAuthRequired, isError, isEmpty);
  const [isExpanded, setExpanded] = useState<boolean>(expanded);

  useEffect(() => {
    if (index && selectedStoryId && index[selectedStoryId]) {
      setExpanded(true);
    }
  }, [index, selectedStoryId]);

  const handleClick = useCallback(() => setExpanded((value) => !value), []);

  const setHighlightedItemId = useCallback(
    (itemId: string) => setHighlighted({ itemId, refId }),
    [setHighlighted, refId]
  );

  const onSelectStoryId = useCallback(
    (storyId: string) => api?.selectStory(storyId, undefined, { ref: isMain ? undefined : refId }),
    [api, isMain, refId]
  );

  return (
    <>
      {isMain || (
        <div
          className={styles.refHead}
          aria-label={`${isExpanded ? 'Hide' : 'Show'} ${title} stories`}
          aria-expanded={isExpanded}
        >
          <button
            className={styles.collapseButton}
            data-action="collapse-ref"
            onClick={handleClick}
          >
            <CollapseIcon isExpanded={isExpanded} />
            <div className={styles.refTitle} title={title}>
              {title}
            </div>
          </button>
          <RefIndicator {...props} state={state} ref={indicatorRef} />
        </div>
      )}
      {isExpanded && (
        <div className={styles.wrapper} data-title={title} data-main={isMain || undefined}>
          {/* @ts-expect-error (non strict) */}
          {state === 'auth' && <AuthBlock id={refId} loginUrl={loginUrl} />}
          {/* @ts-expect-error (non strict) */}
          {state === 'error' && <ErrorBlock error={indexError} />}
          {state === 'loading' && <LoaderBlock isMain={isMain} />}
          {state === 'empty' && (
            <EmptyBlock
              isMain={isMain}
              hasEntries={hasEntries}
              activeFilterCount={activeFilterCount}
            />
          )}
          {state === 'ready' && (
            <Tree
              allStatuses={allStatuses}
              isBrowsing={isBrowsing}
              isMain={isMain}
              refId={refId}
              // @ts-expect-error (non strict)
              data={index}
              // @ts-expect-error (non strict)
              docsMode={storybookState.docsOptions.docsMode}
              selectedStoryId={selectedStoryId}
              onSelectStoryId={onSelectStoryId}
              highlightedRef={highlightedRef}
              setHighlightedItemId={setHighlightedItemId}
            />
          )}
        </div>
      )}
    </>
  );
});
