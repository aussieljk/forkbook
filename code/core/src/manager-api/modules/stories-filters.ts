import { logger } from '@aussieljk/forkbook/internal/client-logger';
import {
  SET_CONFIG,
  SET_FILTER,
  SIDEBAR_FILTER_CHANGED,
} from '@aussieljk/forkbook/internal/core-events';
import { queryFromLocation } from '@aussieljk/forkbook/internal/router';
import type {
  API_FilterFunction,
  API_PreparedStoryIndex,
  StatusValue,
  Tag,
  TagsOptions,
} from '@aussieljk/forkbook/internal/types';

import { throttle } from 'es-toolkit/function';

import { BUILT_IN_FILTERS } from '../../shared/constants/tags.ts';
import { global } from '../../shared/global.ts';
import { countStatusesByValue } from '../../shared/status-store/index.ts';
import type { ModuleArgs } from '../lib/types.tsx';
import { fullStatusStore } from '../stores/status.ts';
import { computeStatusFilterFn, parseStatusesParam, serializeStatusesParam } from './statuses.ts';
import type { SubAPI, SubState } from './stories-types.ts';
import {
  computeStaticFilterFn,
  computeTagsFilterFn,
  getDefaultTagsFromPreset,
  parseTagsParam,
  serializeTagsParam,
} from './tags.ts';

const TAGS_FILTER = 'tags-filter';
const STATIC_FILTER = 'static-filter';
export const STATUS_FILTER = 'status-filter';
const STATUS_CHANGE_REBUILD_THROTTLE = 500;

const BUILT_IN_TAG_IDS = new Set(Object.keys(BUILT_IN_FILTERS));

type FilterType = 'tag' | 'status';

const FILTER_KEYS = {
  tag: { included: 'includedTagFilters', excluded: 'excludedTagFilters' },
  status: { included: 'includedStatusFilters', excluded: 'excludedStatusFilters' },
} as const;

type FilterTelemetryChange = {
  filterType: FilterType;
  filterId: string;
  action: 'include' | 'exclude' | 'remove';
};

type FilterAPI = Pick<
  SubAPI,
  | 'setFilter'
  | 'setFilters'
  | 'resetTagFilters'
  | 'setAllTagFilters'
  | 'addTagFilters'
  | 'removeTagFilters'
  | 'resetStatusFilters'
  | 'setAllStatusFilters'
  | 'addStatusFilters'
  | 'removeStatusFilters'
>;

type FilterState = Pick<
  SubState,
  | 'filters'
  | 'tagPresets'
  | 'defaultIncludedTagFilters'
  | 'defaultExcludedTagFilters'
  | 'includedTagFilters'
  | 'excludedTagFilters'
  | 'includedStatusFilters'
  | 'excludedStatusFilters'
>;

/**
 * The tag and status filters of the sidebar: their state (kept in the URL), the API to change them,
 * and the telemetry event for each change.
 */
export const initFilters = ({
  store,
  provider,
  fullAPI,
  location,
  setIndex,
}: Pick<ModuleArgs, 'store' | 'provider' | 'fullAPI'> & {
  location: ModuleArgs['location'] | undefined;
  setIndex: (index: API_PreparedStoryIndex) => Promise<void>;
}) => {
  const persistFilters = (inputPatch: Parameters<typeof store.setState>[0]) => {
    return store.setState(inputPatch, {
      persistence: 'url' as const,
      serialize: (s: ReturnType<typeof store.getState>) => {
        const tagsValue = serializeTagsParam(s.includedTagFilters, s.excludedTagFilters);
        const statusesValue = serializeStatusesParam(
          s.includedStatusFilters,
          s.excludedStatusFilters
        );
        return { tags: tagsValue ?? null, statuses: statusesValue ?? null };
      },
    });
  };

  const addFilters = async (
    type: FilterType,
    items: string[],
    excluded: boolean
  ): Promise<void> => {
    const { included, excluded: excludedKey } = FILTER_KEYS[type];
    const state = store.getState();
    const newIncluded = new Set<string>(state[included]);
    const newExcluded = new Set<string>(state[excludedKey]);
    for (const item of items) {
      const [target, other] = excluded ? [newExcluded, newIncluded] : [newIncluded, newExcluded];
      other.delete(item);
      target.add(item);
    }
    await persistFilters({
      [included]: Array.from(newIncluded),
      [excludedKey]: Array.from(newExcluded),
    });
  };

  const removeFilters = async (type: FilterType, items: string[]): Promise<void> => {
    const { included, excluded } = FILTER_KEYS[type];
    const state = store.getState();
    const itemSet = new Set(items);
    await persistFilters({
      [included]: (state[included] as string[]).filter((v) => !itemSet.has(v)),
      [excluded]: (state[excluded] as string[]).filter((v) => !itemSet.has(v)),
    });
  };

  const emitFilterTelemetry = (trigger: 'interaction' | 'url', changed?: FilterTelemetryChange) => {
    const state = store.getState();
    const includedTags = (state.includedTagFilters ?? []).filter((id) => BUILT_IN_TAG_IDS.has(id));
    const excludedTags = (state.excludedTagFilters ?? []).filter((id) => BUILT_IN_TAG_IDS.has(id));

    const includedStatuses = state.includedStatusFilters ?? [];
    const excludedStatuses = state.excludedStatusFilters ?? [];

    const storyCounts: Record<string, number> = {};
    const entries = state.internal_index ? Object.values(state.internal_index.entries) : [];
    for (const tagId of new Set([...includedTags, ...excludedTags])) {
      const filterDef = BUILT_IN_FILTERS[tagId as keyof typeof BUILT_IN_FILTERS];
      storyCounts[tagId] = entries.filter((entry) => filterDef(entry)).length;
    }
    if (includedStatuses.length > 0 || excludedStatuses.length > 0) {
      const statusCounts = countStatusesByValue(fullStatusStore.getAll());
      for (const statusValue of new Set([...includedStatuses, ...excludedStatuses])) {
        if (statusCounts[statusValue] !== undefined) {
          storyCounts[statusValue] = statusCounts[statusValue];
        }
      }
    }

    provider.channel?.emit(SIDEBAR_FILTER_CHANGED, {
      trigger,
      changed,
      activeTagFilters: { included: includedTags, excluded: excludedTags },
      activeStatusFilters: { included: includedStatuses, excluded: excludedStatuses },
      storyCounts,
    });
  };

  const api: FilterAPI = {
    setFilter: async (id, filterFunction) => {
      await api.setFilters({ [id]: filterFunction });
    },

    setFilters: async (filters) => {
      await store.setState((state) => ({ filters: { ...state.filters, ...filters } }));
      if (!(await applyCurrentFilters())) {
        return;
      }

      for (const id of Object.keys(filters)) {
        provider.channel?.emit(SET_FILTER, { id });
      }
    },

    resetTagFilters: async () => {
      await persistFilters((s) => ({
        includedTagFilters: s.defaultIncludedTagFilters,
        excludedTagFilters: s.defaultExcludedTagFilters,
      }));

      await recomputeTagsFilter();
    },

    setAllTagFilters: async (included: Tag[], excluded: Tag[]) => {
      await persistFilters({ includedTagFilters: included, excludedTagFilters: excluded });

      await recomputeTagsFilter();
    },

    addTagFilters: async (tags: Tag[], excluded: boolean) => {
      await addFilters('tag', tags, excluded);
      await recomputeTagsFilter();
      if (tags.length === 1 && BUILT_IN_TAG_IDS.has(tags[0])) {
        emitFilterTelemetry('interaction', {
          filterType: 'tag',
          filterId: tags[0],
          action: excluded ? 'exclude' : 'include',
        });
      }
    },

    removeTagFilters: async (tags: Tag[]) => {
      await removeFilters('tag', tags);
      await recomputeTagsFilter();
      if (tags.length === 1 && BUILT_IN_TAG_IDS.has(tags[0])) {
        emitFilterTelemetry('interaction', {
          filterType: 'tag',
          filterId: tags[0],
          action: 'remove',
        });
      }
    },

    resetStatusFilters: async () => {
      await persistFilters({ includedStatusFilters: [], excludedStatusFilters: [] });
      await recomputeStatusFilter();
    },

    setAllStatusFilters: async (included: StatusValue[], excluded: StatusValue[]) => {
      const prevState = store.getState();
      const prevIncluded = new Set(prevState.includedStatusFilters ?? []);
      const prevExcluded = new Set(prevState.excludedStatusFilters ?? []);
      const nextIncluded = new Set(included);
      const nextExcluded = new Set(excluded);

      await persistFilters({ includedStatusFilters: included, excludedStatusFilters: excluded });
      await recomputeStatusFilter();

      const changedIds = new Set<StatusValue>([
        ...prevIncluded,
        ...prevExcluded,
        ...nextIncluded,
        ...nextExcluded,
      ]);
      for (const id of changedIds) {
        const wasIncluded = prevIncluded.has(id);
        const wasExcluded = prevExcluded.has(id);
        const isIncluded = nextIncluded.has(id);
        const isExcluded = nextExcluded.has(id);
        if (wasIncluded === isIncluded && wasExcluded === isExcluded) {
          continue;
        }
        let action: FilterTelemetryChange['action'];
        if (isIncluded) {
          action = 'include';
        } else if (isExcluded) {
          action = 'exclude';
        } else {
          action = 'remove';
        }
        emitFilterTelemetry('interaction', {
          filterType: 'status',
          filterId: id,
          action,
        });
      }
    },

    addStatusFilters: async (statuses: StatusValue[], excluded: boolean) => {
      await addFilters('status', statuses, excluded);
      await recomputeStatusFilter();
      if (statuses.length === 1) {
        emitFilterTelemetry('interaction', {
          filterType: 'status',
          filterId: statuses[0],
          action: excluded ? 'exclude' : 'include',
        });
      }
    },

    removeStatusFilters: async (statuses: StatusValue[]) => {
      await removeFilters('status', statuses);
      await recomputeStatusFilter();
      if (statuses.length === 1) {
        emitFilterTelemetry('interaction', {
          filterType: 'status',
          filterId: statuses[0],
          action: 'remove',
        });
      }
    },
  };

  const applyCurrentFilters = async () => {
    const { internal_index: index } = store.getState();

    if (!index) {
      return false;
    }

    await setIndex(index);

    const refs = await fullAPI.getRefs();
    for (const [refId, { internal_index, ...ref }] of Object.entries(refs)) {
      await fullAPI.setRef(refId, { ...ref, storyIndex: internal_index }, true);
    }

    return true;
  };

  // Simple queue so status-filter rebuilds never overlap.
  let statusFilterRebuildQueued = false;
  let statusFilterRebuildInFlight = false;

  const flushStatusFilterRebuild = async () => {
    if (statusFilterRebuildInFlight) {
      return;
    }
    statusFilterRebuildInFlight = true;
    try {
      while (statusFilterRebuildQueued) {
        statusFilterRebuildQueued = false;
        try {
          await applyCurrentFilters();
        } catch (error) {
          logger.warn('Failed to rebuild story index after status change:', error);
        }
      }
    } finally {
      statusFilterRebuildInFlight = false;
      if (statusFilterRebuildQueued) {
        void flushStatusFilterRebuild();
      }
    }
  };

  const requestStatusFilterRebuild = () => {
    statusFilterRebuildQueued = true;
    void flushStatusFilterRebuild();
  };

  const recomputeTagsFilter = () => {
    const { includedTagFilters, excludedTagFilters } = store.getState();
    return api.setFilters({
      [TAGS_FILTER]: computeTagsFilterFn(includedTagFilters, excludedTagFilters),
    });
  };

  const recomputeStatusFilter = () => {
    const { includedStatusFilters, excludedStatusFilters } = store.getState();
    return api.setFilters({
      [STATUS_FILTER]: computeStatusFilterFn(
        includedStatusFilters ?? [],
        excludedStatusFilters ?? []
      ),
    });
  };

  provider.channel?.on(SET_CONFIG, async () => {
    const {
      includedTagFilters,
      excludedTagFilters,
      includedStatusFilters,
      excludedStatusFilters,
      tagPresets,
    } = store.getState();

    await api.setFilters({
      [STATIC_FILTER]: computeStaticFilterFn(tagPresets),
      [TAGS_FILTER]: computeTagsFilterFn(includedTagFilters, excludedTagFilters),
      [STATUS_FILTER]: computeStatusFilterFn(includedStatusFilters, excludedStatusFilters),
    });
  });

  fullStatusStore.onAllStatusChange(
    throttle(requestStatusFilterRebuild, STATUS_CHANGE_REBUILD_THROTTLE, {
      edges: ['leading', 'trailing'],
    })
  );

  // Compute default tag filter values from presets
  const tagPresets: TagsOptions = global.TAGS_OPTIONS || {};
  const defaultTags = getDefaultTagsFromPreset(tagPresets);

  const { tags, statuses } = queryFromLocation(location ?? { search: '' });
  const parsedTags = parseTagsParam(tags);
  const hasTagsParam = tags !== undefined;
  const initialIncluded: Tag[] = hasTagsParam ? parsedTags.included : defaultTags.included;
  const initialExcluded: Tag[] = hasTagsParam ? parsedTags.excluded : defaultTags.excluded;

  const parsedStatuses = parseStatusesParam(statuses);
  const initialIncludedStatuses: StatusValue[] = parsedStatuses.included;
  const initialExcludedStatuses: StatusValue[] = parsedStatuses.excluded;

  const initialFilters: Record<string, API_FilterFunction> = {
    [STATIC_FILTER]: computeStaticFilterFn(tagPresets),
    [TAGS_FILTER]: computeTagsFilterFn(initialIncluded, initialExcluded),
    [STATUS_FILTER]: computeStatusFilterFn(initialIncludedStatuses, initialExcludedStatuses),
  };

  const state: FilterState = {
    filters: initialFilters,
    tagPresets,
    defaultIncludedTagFilters: defaultTags.included,
    defaultExcludedTagFilters: defaultTags.excluded,
    includedTagFilters: initialIncluded,
    excludedTagFilters: initialExcluded,
    includedStatusFilters: initialIncludedStatuses,
    excludedStatusFilters: initialExcludedStatuses,
  };

  let urlFilterTelemetryEmitted = false;

  /** Sends one telemetry event when the first URL already has built-in tag or status filters. */
  const emitUrlFilterTelemetry = () => {
    if (urlFilterTelemetryEmitted) {
      return;
    }
    urlFilterTelemetryEmitted = true;

    const hasBuiltInTagFilters =
      initialIncluded.some((id) => BUILT_IN_TAG_IDS.has(id)) ||
      initialExcluded.some((id) => BUILT_IN_TAG_IDS.has(id));
    const hasStatusFilters =
      initialIncludedStatuses.length > 0 || initialExcludedStatuses.length > 0;

    if (hasBuiltInTagFilters || hasStatusFilters) {
      emitFilterTelemetry('url');
    }
  };

  return { api, state, emitUrlFilterTelemetry };
};
