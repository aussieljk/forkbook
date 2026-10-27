import React, { useCallback, useState } from 'react';

import { Button, PopoverProvider } from '@aussieljk/forkbook/internal/components';
import type { StatusesByStoryIdAndTypeId, StoryIndex } from '@aussieljk/forkbook/internal/types';
import type { StatusValue } from '@aussieljk/forkbook/internal/types';

import { ListFilterIcon } from 'lucide-react';

import {
  type API,
  type Combo,
  Consumer,
  experimental_useStatusStore,
} from '@aussieljk/forkbook/manager-api';

import { getActiveFilterCount } from '../../../shared/utils/story-index-filters.ts';
import { FilterPanel } from './FilterPanel.tsx';
import styles from './Filter.module.css';

const filterMapper = ({ api, state }: Combo) => ({
  api,
  indexJson: state.internal_index as StoryIndex | undefined,
  activeFilterCount: getActiveFilterCount(state),
  defaultIncludedFilters: state.defaultIncludedTagFilters,
  defaultExcludedFilters: state.defaultExcludedTagFilters,
  includedFilters: state.includedTagFilters,
  excludedFilters: state.excludedTagFilters,
  includedStatusFilters: (state.includedStatusFilters ?? []) as StatusValue[],
  excludedStatusFilters: (state.excludedStatusFilters ?? []) as StatusValue[],
});

interface FilterInnerProps {
  api: API;
  indexJson: StoryIndex;
  activeFilterCount: number;
  defaultIncludedFilters: string[];
  defaultExcludedFilters: string[];
  includedFilters: string[];
  excludedFilters: string[];
  includedStatusFilters: StatusValue[];
  excludedStatusFilters: StatusValue[];
}

const FilterInner = ({
  api,
  indexJson,
  activeFilterCount,
  defaultIncludedFilters,
  defaultExcludedFilters,
  includedFilters,
  excludedFilters,
  includedStatusFilters,
  excludedStatusFilters,
}: FilterInnerProps) => {
  const [expanded, setExpanded] = useState(false);
  const allStatuses = experimental_useStatusStore() as StatusesByStoryIdAndTypeId;

  const handleToggleExpand = useCallback(
    (event: React.SyntheticEvent<Element, Event>): void => {
      event.preventDefault();
      setExpanded(!expanded);
    },
    [expanded]
  );

  return (
    <PopoverProvider
      ariaLabel="Tag filters"
      placement="bottom"
      onVisibleChange={setExpanded}
      offset={8}
      padding={0}
      popover={() => (
        <FilterPanel
          api={api}
          indexJson={indexJson}
          defaultIncludedFilters={defaultIncludedFilters}
          defaultExcludedFilters={defaultExcludedFilters}
          includedFilters={includedFilters}
          excludedFilters={excludedFilters}
          allStatuses={allStatuses}
          includedStatusFilters={includedStatusFilters}
          excludedStatusFilters={excludedStatusFilters}
        />
      )}
    >
      <Button
        key="tags"
        className={styles.filterButton}
        ariaLabel={
          activeFilterCount
            ? `${activeFilterCount} active tag ${activeFilterCount !== 1 ? 'filters' : 'filter'}`
            : 'Tag filters'
        }
        ariaDescription="Filter the items shown in a sidebar based on the tags applied to them."
        variant="ghost"
        padding="small"
        data-highlighted={activeFilterCount > 0 || undefined}
        onClick={handleToggleExpand}
      >
        <ListFilterIcon />
        {activeFilterCount > 0 && <div className={styles.tagSelected} />}
      </Button>
    </PopoverProvider>
  );
};

export const Filter = () => (
  <Consumer filter={filterMapper}>
    {({
      api,
      indexJson,
      activeFilterCount,
      defaultIncludedFilters,
      defaultExcludedFilters,
      includedFilters,
      excludedFilters,
      includedStatusFilters,
      excludedStatusFilters,
    }) =>
      indexJson ? (
        <FilterInner
          api={api}
          indexJson={indexJson}
          activeFilterCount={activeFilterCount}
          defaultIncludedFilters={defaultIncludedFilters}
          defaultExcludedFilters={defaultExcludedFilters}
          includedFilters={includedFilters}
          excludedFilters={excludedFilters}
          includedStatusFilters={includedStatusFilters}
          excludedStatusFilters={excludedStatusFilters}
        />
      ) : null
    }
  </Consumer>
);
