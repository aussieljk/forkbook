import { logger } from '@aussieljk/forkbook/internal/client-logger';
import {
  RESET_STORY_ARGS,
  STORY_INDEX_INVALIDATED,
  UPDATE_STORY_ARGS,
} from '@aussieljk/forkbook/internal/core-events';
import { sanitize, toId } from '@aussieljk/forkbook/internal/csf';
import type { NavigateOptions } from '@aussieljk/forkbook/internal/router';
import {
  fromUrlPath,
  queryFromLocation,
  setStoryPathEntries,
  toUrlPath,
} from '@aussieljk/forkbook/internal/router';
import type {
  API_ComposedRef,
  API_DocsEntry,
  API_HashEntry,
  API_IndexHash,
  API_StoryEntry,
  StoryId,
  StoryIndex,
} from '@aussieljk/forkbook/internal/types';

import { global } from '../../shared/global.ts';
import {
  addPreparedStories,
  getComponentLookupList,
  getStoriesLookupList,
  transformStoryIndexToStoriesHash,
} from '../lib/stories.ts';
import type { ModuleArgs, ModuleFn } from '../lib/types.tsx';
import { buildNavigationUrl } from '../lib/url.ts';
import { fullStatusStore } from '../stores/status.ts';
import { listenToStoryEvents } from './stories-events.ts';
import { initFilters, STATUS_FILTER } from './stories-filters.ts';
import type { DocsUpdate, StoryUpdate, SubAPI, SubState } from './stories-types.ts';

export type { SubAPI, SubState } from './stories-types.ts';

const { fetch } = global;
const STORY_INDEX_PATH = './index.json';

/**
 * Applies a story or docs update to the entry in each index that has it. The indexes are changed in
 * place.
 */
const applyUpdate = (
  indexes: (API_IndexHash | undefined)[],
  id: StoryId,
  update: StoryUpdate | DocsUpdate
) => {
  for (const index of indexes) {
    if (index?.[id]) {
      index[id] = { ...index[id], ...update } as API_HashEntry;
    }
  }
};

export const init: ModuleFn<SubAPI, SubState> = ({
  fullAPI,
  store,
  navigate,
  provider,
  state: { location } = {} as ModuleArgs['state'],
  storyId: initialStoryId,
  viewMode: initialViewMode,
  docsOptions = {},
}) => {
  const navigateWithQueryParams = (path: string, options?: NavigateOptions) => {
    const { customQueryParams } = store.getState();
    navigate(buildNavigationUrl(path, customQueryParams ?? {}), options);
  };

  /**
   * Before the index loads, the manager guesses the story from the URL path. When the index loads,
   * read the URL again, and show the tree URL path for the story.
   */
  const canonicaliseUrl = () => {
    const { location: currentLocation, path, customQueryParams } = store.getState();
    const pathname = currentLocation?.pathname;
    if (!pathname || queryFromLocation(currentLocation).path) {
      return;
    }
    const resolved = fromUrlPath(pathname);
    if (resolved === '/' || (resolved === path && toUrlPath(resolved) === pathname)) {
      return;
    }
    const target = buildNavigationUrl(
      `${resolved}${currentLocation.hash ?? ''}`,
      customQueryParams ?? {}
    );
    navigate(target, { replace: true });
  };

  const filters = initFilters({
    store,
    provider,
    fullAPI,
    location,
    setIndex: (index) => api.setIndex(index),
  });

  const api: SubAPI = {
    ...filters.api,
    storyId: toId,
    getData: (storyId, refId) => {
      const result = api.resolveStory(storyId, refId);
      if (result?.type === 'story' || result?.type === 'docs') {
        return result;
      }
      // The public type says the entry is always found. Callers check for undefined anyway.
      return undefined as never;
    },
    isPrepared: (storyId, refId) => {
      const data = api.getData(storyId, refId);
      if (!data) {
        return false;
      }
      return data.type === 'story' ? data.prepared : true;
    },
    resolveStory: (storyId, refId) => {
      const { refs, index } = store.getState();
      if (refId && !refs[refId]) {
        return undefined;
      }
      if (refId) {
        return refs?.[refId]?.index?.[storyId] ?? undefined;
      }
      return index ? index[storyId] : undefined;
    },
    getCurrentStoryData: () => {
      const { storyId, refId } = store.getState();

      return api.getData(storyId, refId);
    },
    getIndex: () => {
      const { internal_index } = store.getState();
      return internal_index;
    },
    getParameters: (storyIdOrCombo, parameterName) => {
      const { storyId, refId } =
        typeof storyIdOrCombo === 'string'
          ? { storyId: storyIdOrCombo, refId: undefined }
          : storyIdOrCombo;
      const data = api.getData(storyId, refId);

      if (['story', 'docs'].includes(data?.type)) {
        const { parameters } = data;

        if (parameters) {
          return parameterName ? parameters[parameterName] : parameters;
        }
      }

      return null;
    },
    getCurrentParameter: <S>(parameterName?: string) => {
      const { storyId, refId } = store.getState();
      const parameters = api.getParameters({ storyId, refId: refId as string }, parameterName);
      // FIXME Returning falsey parameters breaks a bunch of toolbars code,
      // so this strange logic needs to be here until various client code is updated.
      // The caller names the type of the parameter it asks for.
      return (parameters || undefined) as S;
    },
    jumpToComponent: (direction) => {
      const { filteredIndex, storyId, refs, refId } = store.getState();
      const story = api.getData(storyId, refId);

      // cannot navigate when there's no current selection
      if (!story) {
        return;
      }

      const hash = refId ? refs[refId].filteredIndex || {} : filteredIndex;

      if (!hash) {
        return;
      }

      const result = api.findSiblingStoryId(storyId, hash, direction, true);

      if (result) {
        api.selectStory(result, undefined, { ref: refId });
      }
    },
    jumpToStory: (direction) => {
      const { filteredIndex, storyId, refs, refId } = store.getState();
      const story = api.getData(storyId, refId);

      // cannot navigate when there's no current selection
      if (!story) {
        return;
      }

      const hash = story.refId ? refs[story.refId].filteredIndex : filteredIndex;

      if (!hash) {
        return;
      }

      const result = api.findSiblingStoryId(storyId, hash, direction, false);

      if (result) {
        api.selectStory(result, undefined, { ref: refId });
      }
    },
    selectFirstStory: () => {
      const state = store.getState();
      const { filteredIndex } = state;

      if (filteredIndex) {
        const firstStory = Object.keys(filteredIndex).find(
          (id) => filteredIndex[id].type === 'story'
        );
        if (firstStory) {
          api.selectStory(firstStory);
        }
        return;
      }

      const { index } = state;
      if (!index) {
        return;
      }

      const firstStory = Object.keys(index).find((id) => index[id].type === 'story');

      if (firstStory) {
        api.selectStory(firstStory);
        return;
      }

      navigateWithQueryParams('/');
    },
    selectStory: (titleOrId = undefined, name = undefined, options = {}) => {
      const { ref, scrollTo } = options;
      const { storyId, index, filteredIndex, refs, settings } = store.getState();

      const gotoStory = (entry?: API_HashEntry) => {
        if (entry?.type === 'docs' || entry?.type === 'story') {
          store.setState({ settings: { ...settings, lastTrackedStoryId: entry.id } });
          navigateWithQueryParams(
            `/${entry.type}/${entry.refId ? `${entry.refId}_${entry.id}` : entry.id}${scrollTo ? `#${scrollTo}` : ''}`
          );
          return true;
        }
        return false;
      };

      const kindSlug = storyId?.split('--', 2)[0];
      const hash = ref ? refs[ref].index : index;
      const filteredHash = ref ? refs[ref].filteredIndex : filteredIndex;
      if (!hash || !filteredHash) {
        return;
      }

      if (!name) {
        // Find the entry (group, component, story or docs) that is referred to
        const entry = titleOrId ? hash[titleOrId] || hash[sanitize(titleOrId)] : hash[kindSlug];

        if (!entry) {
          throw new Error(`Unknown id or title: '${titleOrId}'`);
        }

        if (!gotoStory(entry)) {
          // If the entry is not a story or docs, find the first descendant entry that is
          gotoStory(api.findLeafEntry(filteredHash, entry.id));
        }
      } else if (!titleOrId) {
        // Navigate to a named story/docs within the current component (i.e. "kind")
        // This is a slugified version of the kind, but that's OK, our toId function is idempotent
        gotoStory(hash[toId(kindSlug, name)]);
      } else {
        const id = ref ? `${ref}_${toId(titleOrId, name)}` : toId(titleOrId, name);
        if (hash[id]) {
          gotoStory(hash[id]);
        } else {
          // Support legacy API with component permalinks, where kind is `x/y` but permalink is 'z'
          const entry = hash[sanitize(titleOrId)];
          if (entry?.type === 'component') {
            const foundId = entry.children.find((childId) => hash[childId].name === name);
            gotoStory(foundId ? hash[foundId] : undefined);
          }
        }
      }
    },
    findLeafEntry(index, storyId) {
      const entry = index[storyId];
      if (!entry) {
        return undefined;
      }
      if (entry.type === 'docs' || entry.type === 'story') {
        return entry;
      }

      const childStoryId = entry.children.find((childId) => index[childId]);
      return childStoryId ? api.findLeafEntry(index, childStoryId) : undefined;
    },
    findLeafStoryId(index, storyId) {
      return api.findLeafEntry(index, storyId)?.id;
    },
    findAllLeafStoryIds(entryId) {
      const { index } = store.getState();
      if (!index) {
        return [];
      }
      const findChildEntriesRecursively = (currentEntryId: StoryId, results: StoryId[] = []) => {
        const node = index[currentEntryId];
        if (!node) {
          return results;
        }
        if (node.type === 'story') {
          results.push(node.id);
        }
        if ('children' in node) {
          node.children?.forEach((childId) => findChildEntriesRecursively(childId, results));
        }
        return results;
      };
      return findChildEntriesRecursively(entryId, []);
    },
    findSiblingStoryId(storyId, index, direction, toSiblingGroup) {
      if (toSiblingGroup) {
        const lookupList = getComponentLookupList(index);
        const position = lookupList.findIndex((i) => i.includes(storyId));

        // cannot navigate beyond fist or last
        if (position === lookupList.length - 1 && direction > 0) {
          return;
        }
        if (position === 0 && direction < 0) {
          return;
        }

        if (lookupList[position + direction]) {
          return lookupList[position + direction][0];
        }
        return;
      }
      const lookupList = getStoriesLookupList(index);
      const position = lookupList.indexOf(storyId);

      // cannot navigate beyond fist or last
      if (position === lookupList.length - 1 && direction > 0) {
        return;
      }
      if (position === 0 && direction < 0) {
        return;
      }

      return lookupList[position + direction];
    },
    updateStoryArgs: (story, updatedArgs) => {
      const { id: storyId, refId } = story;
      provider.channel?.emit(UPDATE_STORY_ARGS, {
        storyId,
        updatedArgs,
        options: { target: refId },
      });
    },
    resetStoryArgs: (story, argNames) => {
      const { id: storyId, refId } = story;
      provider.channel?.emit(RESET_STORY_ARGS, {
        storyId,
        argNames,
        options: { target: refId },
      });
    },
    fetchIndex: async () => {
      try {
        const result = await fetch(STORY_INDEX_PATH);

        if (result.status !== 200) {
          throw new Error(await result.text());
        }

        const storyIndex = (await result.json()) as StoryIndex;

        // We can only do this if the stories.json is a proper storyIndex
        if (storyIndex.v < 3) {
          logger.warn(`Skipping story index with version v${storyIndex.v}, awaiting SET_STORIES.`);
          return;
        }

        await api.setIndex(storyIndex);
      } catch (err) {
        await store.setState({ indexError: err as Error });
      }
    },
    // The story index we receive on SET_INDEX is "prepared" in that it has parameters
    // The story index we receive on fetchStoryIndex is not, but all the prepared fields are optional
    // so we can cast one to the other easily enough
    setIndex: async (input) => {
      const { filteredIndex: oldFilteredHash, index: oldHash, filters } = store.getState();
      const allStatuses = fullStatusStore.getAll();
      const newFilteredHash = transformStoryIndexToStoriesHash(input, {
        provider,
        docsOptions,
        filters,
        allStatuses,
        statusFilterKey: STATUS_FILTER,
      });
      const newHash = transformStoryIndexToStoriesHash(input, {
        provider,
        docsOptions,
        filters: {},
        allStatuses,
      });

      setStoryPathEntries(Object.values(input.entries));

      await store.setState({
        internal_index: input,
        filteredIndex: addPreparedStories(newFilteredHash, oldFilteredHash),
        index: addPreparedStories(newHash, oldHash),
        indexError: undefined,
      });

      canonicaliseUrl();
    },
    // FIXME: is there a bug where filtered stories get added back in on updateStory???
    updateStory: async (storyId, update, ref) => {
      await applyEntryUpdate(storyId, update, ref);
    },
    updateDocs: async (docsId, update, ref) => {
      await applyEntryUpdate(docsId, update, ref);
    },
    setPreviewInitialized: async (ref) => {
      if (!ref) {
        store.setState({ previewInitialized: true });
      } else {
        fullAPI.updateRef(ref.id, { previewInitialized: true });
      }
    },
  };

  const applyEntryUpdate = async (
    id: StoryId,
    update: StoryUpdate | DocsUpdate,
    ref?: API_ComposedRef
  ) => {
    if (!ref) {
      const { index, filteredIndex } = store.getState();
      applyUpdate([index, filteredIndex], id, update);
      if (index || filteredIndex) {
        await store.setState({ index, filteredIndex });
      }
      return;
    }
    const { id: refId, index, filteredIndex } = ref;
    // Cache the runtime enrichment on the ref so it survives index (re)builds in `setRef` and is
    // applied even when it arrives before the ref index is first composed (the deep-link race in
    // #34553, where the preview sends STORY_PREPARED once, before the index has been composed).
    const storyUpdates = {
      ...ref.storyUpdates,
      [id]: { ...ref.storyUpdates?.[id], ...update },
    };
    applyUpdate([index, filteredIndex], id, update);
    await fullAPI.updateRef(refId, { index, filteredIndex, storyUpdates });
  };

  listenToStoryEvents({ store, provider, fullAPI, api, navigateWithQueryParams });

  return {
    api,
    state: {
      storyId: initialStoryId as string,
      viewMode: initialViewMode,
      hasCalledSetOptions: false,
      previewInitialized: false,
      ...filters.state,
    },
    init: async () => {
      provider.channel?.on(STORY_INDEX_INVALIDATED, () => api.fetchIndex());

      await api.fetchIndex();

      filters.emitUrlFilterTelemetry();
    },
  };
};
