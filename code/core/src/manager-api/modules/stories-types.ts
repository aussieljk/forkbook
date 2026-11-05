import type { toId } from '@aussieljk/forkbook/internal/csf';
import type {
  API_ComposedRef,
  API_DocsEntry,
  API_FilterFunction,
  API_HashEntry,
  API_IndexHash,
  API_LeafEntry,
  API_LoadedRefData,
  API_PreparedStoryIndex,
  API_StoryEntry,
  API_TestEntry,
  API_ViewMode,
  Args,
  StatusValue,
  StoryId,
  Tag,
  TagsOptions,
} from '@aussieljk/forkbook/internal/types';

import type { ComposedRef } from '../root.tsx';

export type Direction = -1 | 1;
type ParameterName = string;

export type StoryUpdate = Partial<
  Pick<API_StoryEntry, 'prepared' | 'parameters' | 'initialArgs' | 'argTypes' | 'args'>
>;

export type DocsUpdate = Partial<Pick<API_DocsEntry, 'prepared' | 'parameters'>>;

export interface SubState extends API_LoadedRefData {
  storyId: StoryId;
  internal_index?: API_PreparedStoryIndex;
  viewMode: API_ViewMode;
  filters: Record<string, API_FilterFunction>;
  tagPresets: TagsOptions;
  defaultIncludedTagFilters: Tag[];
  defaultExcludedTagFilters: Tag[];
  includedTagFilters: Tag[];
  excludedTagFilters: Tag[];
  includedStatusFilters: StatusValue[];
  excludedStatusFilters: StatusValue[];
}

export interface SubAPI {
  /**
   * The `storyId` method is a reference to the `toId` function from `@storybook/csf`, which is used
   * to generate a unique ID for a story. This ID is used to identify a specific story in the
   * Forkbook index.
   *
   * @type {typeof toId}
   */
  storyId: typeof toId;
  /**
   * Resolves a story, docs, component or group ID to its corresponding hash entry in the index.
   *
   * @param {StoryId} storyId - The ID of the story to resolve.
   * @param {string} [refsId] - The ID of the refs to use for resolving the story.
   * @returns {API_HashEntry} - The hash entry corresponding to the given story ID.
   */
  resolveStory: (storyId: StoryId, refsId?: string) => API_HashEntry | undefined;
  /**
   * Selects the first story to display in the Forkbook UI.
   *
   * @returns {void}
   */
  selectFirstStory: () => void;
  /**
   * Selects a story to display in the Forkbook UI.
   *
   * @param {string} [kindOrId] - The kind or ID of the story to select.
   * @param {StoryId} [story] - The ID of the story to select.
   * @param {Object} [obj] - An optional object containing additional options.
   * @param {string} [obj.ref] - The ref ID of the story to select.
   * @param {API_ViewMode} [obj.viewMode] - The view mode to display the story in.
   * @returns {void}
   */
  selectStory: (
    kindOrId?: string,
    story?: StoryId,
    obj?: { ref?: string; viewMode?: API_ViewMode; scrollTo?: string }
  ) => void;
  /**
   * Returns the current story's data, including its ID, kind, name, and parameters.
   *
   * @returns {API_LeafEntry} The current story's data.
   */
  getCurrentStoryData: () => API_LeafEntry;
  /**
   * Returns the current story index.
   *
   * @returns {API_PreparedStoryIndex | undefined} The current story index, or undefined if not yet
   *   loaded.
   */
  getIndex: () => API_PreparedStoryIndex | undefined;
  /**
   * Sets the prepared story index to the given value.
   *
   * @param {API_PreparedStoryIndex} index - The prepared story index to set.
   * @returns {Promise<void>} A promise that resolves when the prepared story index has been set.
   */
  setIndex: (index: API_PreparedStoryIndex) => Promise<void>;

  /**
   * Jumps to the next or previous component in the index.
   *
   * @param {Direction} direction - The direction to jump. Use -1 to jump to the previous component,
   *   and 1 to jump to the next component.
   * @returns {void}
   */
  jumpToComponent: (direction: Direction) => void;
  /**
   * Jumps to the next or previous story in the story index.
   *
   * @param {Direction} direction - The direction to jump. Use -1 to jump to the previous story, and
   *   1 to jump to the next story.
   * @returns {void}
   */
  jumpToStory: (direction: Direction) => void;
  /**
   * Returns the data for the given story ID and optional ref ID.
   *
   * @param {StoryId} storyId - The ID of the story to retrieve data for.
   * @param {string} [refId] - The ID of the ref to retrieve data for. If not provided, retrieves
   *   data for the default ref.
   * @returns {API_LeafEntry} The data for the given story ID and optional ref ID.
   */
  getData: (storyId: StoryId, refId?: string) => API_LeafEntry;
  /**
   * Returns a boolean indicating whether the given story ID and optional ref ID have been prepared.
   *
   * @param {StoryId} storyId - The ID of the story to check.
   * @param {string} [refId] - The ID of the ref to check. If not provided, checks all refs for the
   *   given story ID.
   * @returns {boolean} A boolean indicating whether the given story ID and optional ref ID have
   *   been prepared.
   */
  isPrepared: (storyId: StoryId, refId?: string) => boolean;
  /**
   * Returns the parameters for the given story ID and optional ref ID.
   *
   * @param {StoryId | { storyId: StoryId; refId: string }} storyId - The ID of the story to
   *   retrieve parameters for, or an object containing the story ID and ref ID.
   * @param {ParameterName} [parameterName] - The name of the parameter to retrieve. If not
   *   provided, returns all parameters.
   * @returns {API_StoryEntry['parameters'] | any} The parameters for the given story ID and
   *   optional ref ID.
   */
  getParameters: (
    storyId: StoryId | { storyId: StoryId; refId: string },
    parameterName?: ParameterName
  ) => API_StoryEntry['parameters'] | any;
  /**
   * Returns the current value of the specified parameter for the currently selected story.
   *
   * @template S - The type of the parameter value.
   * @param {ParameterName} [parameterName] - The name of the parameter to retrieve. If not
   *   provided, returns all parameters.
   * @returns {S} The value of the specified parameter for the currently selected story.
   */
  getCurrentParameter<S>(parameterName?: ParameterName): S;
  /**
   * Updates the arguments for the given story with the provided new arguments.
   *
   * @param {API_StoryEntry | API_TestEntry} story - The story to update the arguments for.
   * @param {Args} newArgs - The new arguments to set for the story.
   * @returns {void}
   */
  updateStoryArgs(story: API_StoryEntry | API_TestEntry, newArgs: Args): void;
  /**
   * Resets the arguments for the given story to their initial values.
   *
   * @param {API_StoryEntry | API_TestEntry} story - The story to reset the arguments for.
   * @param {string[]} [argNames] - An optional array of argument names to reset. If not provided,
   *   all arguments will be reset.
   * @returns {void}
   */
  resetStoryArgs: (story: API_StoryEntry | API_TestEntry, argNames?: string[]) => void;
  /**
   * Finds the leaf entry for the given story ID in the given story index.
   *
   * @param {API_IndexHash} index - The story index to search for the leaf entry in.
   * @param {StoryId} storyId - The ID of the story to find the leaf entry for.
   * @returns {API_LeafEntry | undefined} The leaf entry for the given story ID, or undefined if no
   *   leaf entry was found.
   */
  findLeafEntry(index: API_IndexHash, storyId: StoryId): API_LeafEntry | undefined;
  /**
   * Finds the leaf story ID for the given component or group ID in the given index.
   *
   * @param {API_IndexHash} index - The story index to search for the leaf story ID in.
   * @param {StoryId} storyId - The ID of the story to find the leaf story ID for.
   * @returns {StoryId | undefined} The ID of the leaf story, or undefined if no leaf story was
   *   found.
   */
  findLeafStoryId(index: API_IndexHash, storyId: StoryId): StoryId | undefined;
  /**
   * Finds all the leaf story IDs for the given entry ID in the given index.
   *
   * @param {StoryId} entryId - The ID of the entry to find the leaf story IDs for.
   * @returns {StoryId[]} The IDs of all the leaf stories, or an empty array if no leaf stories were
   *   found.
   */
  findAllLeafStoryIds(entryId: string): StoryId[];
  /**
   * Finds the ID of the sibling story in the given direction for the given story ID in the given
   * story index.
   *
   * @param {StoryId} storyId - The ID of the story to find the sibling of.
   * @param {API_IndexHash} index - The story index to search for the sibling in.
   * @param {Direction} direction - The direction to search for the sibling in.
   * @param {boolean} toSiblingGroup - When true, skips over leafs within the same group.
   * @returns {StoryId | undefined} The ID of the sibling story, or undefined if there is none.
   */
  findSiblingStoryId(
    storyId: StoryId,
    index: API_IndexHash,
    direction: Direction,
    toSiblingGroup: boolean // when true, skip over leafs within the same group
  ): StoryId | undefined;
  /**
   * Fetches the story index from the server.
   *
   * @returns {Promise<void>} A promise that resolves when the index has been fetched.
   */
  fetchIndex: () => Promise<void>;
  /**
   * Updates the story with the given ID with the provided update object.
   *
   * @param {StoryId} storyId - The ID of the story to update.
   * @param {StoryUpdate} update - An object containing the updated story information.
   * @param {API_ComposedRef} [ref] - The composed ref of the story to update.
   * @returns {Promise<void>} A promise that resolves when the story has been updated.
   */
  updateStory: (storyId: StoryId, update: StoryUpdate, ref?: API_ComposedRef) => Promise<void>;
  /**
   * Updates the documentation for the given story ID with the given update object.
   *
   * @param {StoryId} storyId - The ID of the story to update.
   * @param {DocsUpdate} update - An object containing the updated documentation information.
   * @param {API_ComposedRef} [ref] - The composed ref of the story to update.
   * @returns {Promise<void>} A promise that resolves when the documentation has been updated.
   */
  updateDocs: (storyId: StoryId, update: DocsUpdate, ref?: API_ComposedRef) => Promise<void>;
  /**
   * Sets the preview as initialized.
   *
   * @param {ComposedRef} [ref] - The composed ref of the story to set as initialized.
   * @returns {Promise<void>} A promise that resolves when the preview has been set as initialized.
   */
  setPreviewInitialized: (ref?: ComposedRef) => Promise<void>;
  /**
   * Registers one sidebar filter. A story or docs entry shows only when every registered filter
   * passes. Pass a function that always returns true to stop filtering for that id.
   */
  setFilter: (id: string, filterFunction: API_FilterFunction) => Promise<void>;
  /**
   * Registers several sidebar filters at once, then re-applies the story index.
   */
  setFilters: (filters: Record<string, API_FilterFunction>) => Promise<void>;

  /** Resets tag filters in the sidebar to the default filters. */
  resetTagFilters(): Promise<void>;
  /**
   * Replaces all tag filters in the sidebar with the provided included and excluded lists.
   *
   * @param included The tags to include in the filtered stories list
   * @param excluded The tags to filter out (exclude) from the stories list
   */
  setAllTagFilters(included: Tag[], excluded: Tag[]): Promise<void>;
  /**
   * Adds tag filters to the included or excluded filter lists. Included filters are included in the
   * stories list, whereas excluded filters are filtered out.
   *
   * @param tags The tags to add as filters.
   * @param excluded Whether to add the tags to the include or exclude filter list.
   */
  addTagFilters(tags: Tag[], excluded: boolean): Promise<void>;
  /**
   * Removes tag filters from both the included and excluded filter lists.
   *
   * @param tags The tags to remove from filters.
   */
  removeTagFilters(tags: Tag[]): Promise<void>;

  /** Resets status filters in the sidebar (clears both included and excluded). */
  resetStatusFilters(): Promise<void>;
  /**
   * Replaces all status filters in the sidebar with the provided included and excluded lists.
   *
   * @param included The status values to include in the filtered stories list
   * @param excluded The status values to filter out (exclude) from the stories list
   */
  setAllStatusFilters(included: StatusValue[], excluded: StatusValue[]): Promise<void>;
  /**
   * Adds status filters to the included or excluded filter lists.
   *
   * @param statuses The status values to add as filters.
   * @param excluded Whether to add to the include or exclude filter list.
   */
  addStatusFilters(statuses: StatusValue[], excluded: boolean): Promise<void>;
  /**
   * Removes status filters from both the included and excluded filter lists.
   *
   * @param statuses The status values to remove from filters.
   */
  removeStatusFilters(statuses: StatusValue[]): Promise<void>;
}
