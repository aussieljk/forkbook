import {
  CONFIG_ERROR,
  CURRENT_STORY_WAS_SET,
  DOCS_PREPARED,
  PRELOAD_ENTRIES,
  SELECT_STORY,
  SET_CURRENT_STORY,
  SET_INDEX,
  SET_STORIES,
  STORY_ARGS_UPDATED,
  STORY_CHANGED,
  STORY_MISSING,
  STORY_PREPARED,
  STORY_SPECIFIED,
} from '@aussieljk/forkbook/internal/core-events';
import type {
  API_PreparedStoryIndex,
  API_ViewMode,
  Args,
  ComponentTitle,
  DocsPreparedPayload,
  SetStoriesPayload,
  StoryId,
  StoryKind,
  StoryName,
  StoryPreparedPayload,
} from '@aussieljk/forkbook/internal/types';

import { isReviewManagerRoute } from '../../shared/review/routes.ts';
import { type EventMeta, getEventMetadata } from '../lib/events.ts';
import { denormalizeStoryParameters } from '../lib/stories.ts';
import type { ModuleArgs } from '../lib/types.tsx';
import type { LayoutOptions } from './layout.ts';
import type { SubAPI } from './stories-types.ts';

const removedOptions = ['enableShortcuts', 'theme', 'showRoots'];

function removeRemovedOptions(options?: LayoutOptions) {
  if (!options || typeof options === 'string') {
    return options;
  }
  const result = { ...options };

  removedOptions.forEach((option) => {
    if (option in result) {
      delete result[option];
    }
  });

  return result;
}

/** Listens to the story events that the preview and the refs send on the channel. */
export const listenToStoryEvents = ({
  store,
  provider,
  fullAPI,
  api,
  navigateWithQueryParams,
}: Pick<ModuleArgs, 'store' | 'provider' | 'fullAPI'> & {
  api: SubAPI;
  navigateWithQueryParams: (path: string) => void;
}) => {
  // On initial load, the local iframe will select the first story (or other "selection specifier")
  // and emit STORY_SPECIFIED with the id. We need to ensure we respond to this change.
  provider.channel?.on(
    STORY_SPECIFIED,
    function handler(
      this: EventMeta,
      { storyId, viewMode }: { storyId: string; viewMode: API_ViewMode }
    ) {
      const { sourceType } = getEventMetadata(this, fullAPI)!;

      if (sourceType === 'local') {
        const state = store.getState();
        const isCanvasRoute =
          !isReviewManagerRoute(state.path, state.customQueryParams) &&
          (state.path === '/' || state.viewMode === 'story' || state.viewMode === 'docs');
        const stateHasSelection = state.viewMode && state.storyId;
        const stateSelectionDifferent = state.viewMode !== viewMode || state.storyId !== storyId;
        const { type } = state.index?.[state.storyId] || {};
        const isStory = !(type === 'root' || type === 'component' || type === 'group');

        /**
         * When Forkbook starts, we want to navigate to the first story. But there are a few
         * exceptions:
         *
         * - If the current storyId and viewMode are already set/correct AND the url section is a
         *   leaf-type.
         * - If the user has navigated away already.
         * - If the user started Forkbook with a specific page-URL like "/settings/about"
         */
        if (isCanvasRoute) {
          const { filteredIndex } = state;

          if (filteredIndex && !stateHasSelection) {
            const storyPassesFilter = filteredIndex[storyId]?.type === 'story';

            if (!storyPassesFilter) {
              const firstFiltered = Object.keys(filteredIndex).find((id) => {
                const entry = filteredIndex[id];
                return entry.type === 'story' || entry.type === 'docs';
              });

              if (firstFiltered) {
                navigateWithQueryParams(`/${viewMode}/${firstFiltered}`);
              }

              return;
            }
          }

          if (stateHasSelection && stateSelectionDifferent && isStory) {
            // The manager state is correct, the preview state is lagging behind
            provider.channel?.emit(SET_CURRENT_STORY, {
              storyId: state.storyId,
              viewMode: state.viewMode,
            });
          } else if (stateSelectionDifferent) {
            // The preview state is correct, the manager state is lagging behind
            navigateWithQueryParams(`/${viewMode}/${storyId}`);
          }
        }
      }
    }
  );

  // The CURRENT_STORY_WAS_SET event is the best event to use to tell if a ref is ready.
  // Until the ref has a selection, it will not render anything (e.g. while waiting for
  // the preview.js file or the index to load). Once it has a selection, it will render its own
  // preparing spinner.
  provider.channel?.on(CURRENT_STORY_WAS_SET, function handler(this: EventMeta) {
    const { ref } = getEventMetadata(this, fullAPI)!;
    api.setPreviewInitialized(ref);
  });

  provider.channel?.on(STORY_CHANGED, function handler(this: EventMeta) {
    const { sourceType } = getEventMetadata(this, fullAPI)!;

    if (sourceType === 'local') {
      const options = api.getCurrentParameter<LayoutOptions>('options');

      if (options) {
        fullAPI.setOptions(removeRemovedOptions(options));
      }
    }
  });

  provider.channel?.on(
    STORY_PREPARED,
    function handler(this: EventMeta, { id, ...update }: StoryPreparedPayload) {
      const { ref, sourceType } = getEventMetadata(this, fullAPI)!;
      api.updateStory(id, { ...update, prepared: true }, ref);

      if (!ref) {
        if (!store.getState().hasCalledSetOptions) {
          const { options } = update.parameters;
          fullAPI.setOptions(removeRemovedOptions(options));
          store.setState({ hasCalledSetOptions: true });
        }
      }

      if (sourceType === 'local') {
        const { storyId, index, refId } = store.getState();

        if (!index) {
          return;
        }

        // create a list of related stories to be preloaded
        const toBePreloaded = Array.from(
          new Set([
            api.findSiblingStoryId(storyId, index, 1, true),
            api.findSiblingStoryId(storyId, index, -1, true),
          ])
        ).filter(Boolean);

        provider.channel?.emit(PRELOAD_ENTRIES, {
          ids: toBePreloaded,
          options: { target: refId },
        });
      }
    }
  );

  provider.channel?.on(
    DOCS_PREPARED,
    function handler(this: EventMeta, { id, ...update }: DocsPreparedPayload) {
      const { ref } = getEventMetadata(this, fullAPI)!;
      api.updateStory(id, { ...update, prepared: true }, ref);
    }
  );

  provider.channel?.on(SET_INDEX, function handler(this: EventMeta, index: API_PreparedStoryIndex) {
    const { ref } = getEventMetadata(this, fullAPI)!;

    if (!ref) {
      api.setIndex(index);
      const options = api.getCurrentParameter<LayoutOptions>('options');
      fullAPI.setOptions(removeRemovedOptions(options));
    } else {
      fullAPI.setRef(ref.id, { ...ref, storyIndex: index }, true);
    }
  });

  // For composition back-compatibilty
  provider.channel?.on(SET_STORIES, function handler(this: EventMeta, data: SetStoriesPayload) {
    const { ref } = getEventMetadata(this, fullAPI)!;
    const setStoriesData = data.v ? denormalizeStoryParameters(data) : data.stories;

    if (!ref) {
      throw new Error('Cannot call SET_STORIES for local frame');
    } else {
      fullAPI.setRef(ref.id, { ...ref, setStoriesData }, true);
    }
  });

  provider.channel?.on(
    SELECT_STORY,
    function handler(
      this: EventMeta,
      {
        kind,
        title = kind,
        story,
        name = story,
        storyId,
        ...rest
      }: {
        kind?: StoryKind;
        title?: ComponentTitle;
        story?: StoryName;
        name?: StoryName;
        storyId: string;
        viewMode: API_ViewMode;
      }
    ) {
      const { ref } = getEventMetadata(this, fullAPI)!;

      if (!ref) {
        fullAPI.selectStory(storyId || title, name, rest);
      } else {
        fullAPI.selectStory(storyId || title, name, { ...rest, ref: ref.id });
      }
    }
  );

  provider.channel?.on(
    STORY_ARGS_UPDATED,
    function handleStoryArgsUpdated(
      this: EventMeta,
      { storyId, args }: { storyId: StoryId; args: Args }
    ) {
      const { ref } = getEventMetadata(this, fullAPI)!;
      api.updateStory(storyId, { args }, ref);
    }
  );

  // When there's a preview error, we don't show it in the manager, but simply
  // mark the preview as initialised.
  provider.channel?.on(CONFIG_ERROR, function handleConfigError(this: EventMeta) {
    const { ref } = getEventMetadata(this, fullAPI)!;
    api.setPreviewInitialized(ref);
  });

  provider.channel?.on(STORY_MISSING, function handleStoryMissing(this: EventMeta) {
    const { ref } = getEventMetadata(this, fullAPI)!;
    api.setPreviewInitialized(ref);
  });
};
