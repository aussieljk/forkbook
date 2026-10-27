import React, { type SyntheticEvent, useMemo } from 'react';

import { Button, ToggleButton } from '@aussieljk/forkbook/internal/components';
import type {
  API_PreparedIndexEntry,
  StatusesByStoryIdAndTypeId,
  StatusValue,
  StoryIndex,
  Tag,
} from '@aussieljk/forkbook/internal/types';

import { RotateCcwIcon } from 'lucide-react';

import {
  experimental_useStatusStore,
  useStorybookApi,
  useStorybookState,
} from '@aussieljk/forkbook/manager-api';

import { computeStatusFilterFn } from '../../../manager-api/modules/statuses.ts';
import { computeTagsFilterFn } from '../../../manager-api/modules/tags.ts';
import { UseSymbol } from './IconSymbols.tsx';
import { useActiveReviewStoryCount } from './ReviewWidget.tsx';
import styles from './ShowChangesButton.module.css';

const NEW = 'status-value:new' as StatusValue;
const MOD = 'status-value:modified' as StatusValue;

/** Quick-filter CTA between the search field and story tree, shown when changes are detected. */
export const ShowChangesButton = () => {
  const api = useStorybookApi();
  const {
    internal_index: index,
    includedStatusFilters: rawIncludedStatusFilters,
    excludedStatusFilters: rawExcludedStatusFilters,
    includedTagFilters: rawIncludedTagFilters,
    excludedTagFilters: rawExcludedTagFilters,
  } = useStorybookState();
  const allStatuses = experimental_useStatusStore() as StatusesByStoryIdAndTypeId;
  const activeReviewStoryCount = useActiveReviewStoryCount();

  const { newCount, modifiedCount } = useMemo(() => {
    if (!index) {
      return { newCount: 0, modifiedCount: 0 };
    }
    const includedStatusFilters = (rawIncludedStatusFilters ?? []) as StatusValue[];
    const excludedStatusFilters = (rawExcludedStatusFilters ?? []) as StatusValue[];
    const includedTagFilters = (rawIncludedTagFilters ?? []) as Tag[];
    const excludedTagFilters = (rawExcludedTagFilters ?? []) as Tag[];
    const contextualIncludedStatuses = includedStatusFilters.filter((s) => s !== NEW && s !== MOD);
    const contextualExcludedStatuses = excludedStatusFilters.filter((s) => s !== NEW && s !== MOD);
    const tagFilterFn = computeTagsFilterFn(includedTagFilters, excludedTagFilters);
    const statusFilterFn = computeStatusFilterFn(
      contextualIncludedStatuses,
      contextualExcludedStatuses
    );

    let next = 0;
    let modified = 0;
    const entries = (index as StoryIndex).entries ?? {};
    for (const [storyId, statusesByType] of Object.entries(allStatuses)) {
      const entry = entries[storyId] as API_PreparedIndexEntry | undefined;
      if (!entry) {
        continue;
      }
      const entryWithStatuses = { ...entry, statuses: statusesByType };
      if (!tagFilterFn(entryWithStatuses) || !statusFilterFn(entryWithStatuses)) {
        continue;
      }
      const statuses = Object.values(statusesByType);
      if (statuses.some(({ value }) => value === NEW)) {
        next += 1;
      }
      if (statuses.some(({ value }) => value === MOD)) {
        modified += 1;
      }
    }
    return { newCount: next, modifiedCount: modified };
  }, [
    index,
    allStatuses,
    rawIncludedStatusFilters,
    rawExcludedStatusFilters,
    rawIncludedTagFilters,
    rawExcludedTagFilters,
  ]);

  const includedStatusFilters = (rawIncludedStatusFilters ?? []) as StatusValue[];
  const excludedStatusFilters = (rawExcludedStatusFilters ?? []) as StatusValue[];
  const isActive = includedStatusFilters.includes(NEW) && includedStatusFilters.includes(MOD);

  // The review widget renders in the same spot and takes precedence over this CTA.
  if (activeReviewStoryCount > 0) {
    return null;
  }

  if (newCount === 0 && modifiedCount === 0) {
    return null;
  }

  const clearFilters = () => {
    const nextIncluded = includedStatusFilters.filter((s) => s !== NEW && s !== MOD);
    const nextExcluded = excludedStatusFilters.filter((s) => s !== NEW && s !== MOD);
    api.setAllStatusFilters(nextIncluded, nextExcluded);
  };

  const onClick = () => {
    if (isActive) {
      clearFilters();
    } else {
      const nextIncluded = Array.from(new Set([...includedStatusFilters, NEW, MOD]));
      const nextExcluded = excludedStatusFilters.filter((s) => s !== NEW && s !== MOD);
      api.setAllStatusFilters(nextIncluded, nextExcluded);
    }
  };

  const onClearClick = (e: SyntheticEvent) => {
    e.stopPropagation();
    clearFilters();
  };

  const changeKinds =
    newCount > 0 && modifiedCount > 0 ? 'new and modified' : newCount > 0 ? 'new' : 'modified';
  const label = `${isActive ? 'Showing' : 'Show'} ${changeKinds} stories`;
  const ariaLabel = `${label} since last commit`;

  return (
    <div className={styles.wrapper}>
      <ToggleButton
        className={styles.cta}
        variant="ghost"
        padding="small"
        pressed={isActive}
        ariaLabel={ariaLabel}
        onClick={onClick}
      >
        <svg className={styles.icon} viewBox="0 0 14 14" width="14" height="14" aria-hidden>
          <UseSymbol type="modified" />
        </svg>
        {label}
      </ToggleButton>
      {isActive && (
        <Button
          variant="ghost"
          padding="small"
          size="small"
          onClick={onClearClick}
          ariaLabel="Clear"
        >
          <RotateCcwIcon />
        </Button>
      )}
    </div>
  );
};
