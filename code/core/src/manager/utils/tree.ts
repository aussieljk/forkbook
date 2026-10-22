import type { SyntheticEvent } from 'react';

import { global } from '../../shared/global.ts';

import memoize from 'memoizerific';
import type { HashEntry, IndexHash } from '@aussieljk/forkbook/manager-api';

import { DEFAULT_REF_ID } from '../components/sidebar/Sidebar.tsx';
import type { Dataset, Item, RefType } from '../components/sidebar/types.ts';

const { document, window: globalWindow } = global;

export const createId = (itemId: string, refId?: string) =>
  !refId || refId === DEFAULT_REF_ID ? itemId : `${refId}_${itemId}`;

export const getLink = (item: HashEntry, refId?: string) => {
  return `${document.location.pathname}?path=/${item.type}/${createId(item.id, refId)}`;
};

export const prevent = (e: SyntheticEvent) => {
  e.preventDefault();
  return false;
};

export const get = memoize(1000)((id: string, dataset: Dataset) => dataset[id]);
export const getParent = memoize(1000)((id: string, dataset: Dataset) => {
  const item = get(id, dataset);
  return item && item.type !== 'root' ? get(item.parent as string, dataset) : undefined;
});
export const getParents = memoize(1000)((id: string, dataset: Dataset): Item[] => {
  const parent = getParent(id, dataset);
  return parent ? [parent, ...getParents(parent.id, dataset)] : [];
});
export const getAncestorIds = memoize(1000)((data: IndexHash, id: string): string[] =>
  getParents(id, data).map((item) => item.id)
);
export const getDescendantIds = memoize(1000)((
  data: IndexHash,
  id: string,
  skipLeafs: boolean
): string[] => {
  const entry = data[id];
  if (!entry || !('children' in entry) || !entry.children) {
    return [];
  }
  return entry.children.reduce((acc, childId) => {
    const child = data[childId];

    if (!child || (skipLeafs && (child.type === 'story' || child.type === 'docs'))) {
      return acc;
    }
    acc.push(childId, ...getDescendantIds(data, childId, skipLeafs));
    return acc;
  }, [] as string[]);
});

export function getPath(item: Item, ref: Pick<RefType, 'id' | 'title' | 'index'>): string[] {
  // @ts-expect-error (non strict)
  const parent = item.type !== 'root' && item.parent ? ref.index[item.parent] : null;

  if (parent) {
    return [...getPath(parent, ref), parent.name];
  }
  return ref.id === DEFAULT_REF_ID ? [] : [ref.title || ref.id];
}

export const searchItem = <T extends Item>(
  item: T,
  ref: Parameters<typeof getPath>[1]
): T & { refId: string; path: string[] } => {
  return { ...item, refId: ref.id, path: getPath(item, ref) };
};

export function cycle<T>(array: T[], index: number, delta: number): number {
  let next = index + (delta % array.length);

  if (next < 0) {
    next = array.length + next;
  }

  if (next >= array.length) {
    next -= array.length;
  }
  return next;
}

export const scrollIntoView = (element: Element, center = false) => {
  if (!element) {
    return;
  }
  const { top, bottom } = element.getBoundingClientRect();
  if (!top || !bottom) {
    return;
  }
  const bottomOffset =
    document?.querySelector('#sidebar-bottom-wrapper')?.getBoundingClientRect().top ||
    globalWindow.innerHeight ||
    document.documentElement.clientHeight;
  if (bottom > bottomOffset) {
    element.scrollIntoView({ block: center ? 'center' : 'nearest' });
  }
};

export const getStateType = (
  isLoading: boolean,
  isAuthRequired: boolean,
  isError: boolean,
  isEmpty: boolean
) => {
  switch (true) {
    case isAuthRequired:
      return 'auth';
    case isError:
      return 'error';
    case isLoading:
      return 'loading';
    case isEmpty:
      return 'empty';
    default:
      return 'ready';
  }
};

export const isAncestor = (element?: Element, maybeAncestor?: Element): boolean => {
  if (!element || !maybeAncestor) {
    return false;
  }

  if (element === maybeAncestor) {
    return true;
  }
  return isAncestor(element.parentElement || undefined, maybeAncestor);
};

export const removeNoiseFromName = (storyName: string) => storyName.replaceAll(/(\s|-|_)/gi, '');

export const isStoryHoistable = (storyName: string, componentName: string) =>
  removeNoiseFromName(storyName) === removeNoiseFromName(componentName);

/**
 * Find the components that the sidebar shows as one leaf (single story hoisting):
 *
 * - A component with only one docs child.
 * - A component with one story child that has the same name as the component.
 * - The same, plus one autodocs entry. The sidebar hides the autodocs entry. It stays reachable
 *   by its URL and in the search results.
 *
 * Returns a map from each hoisted component id to the id of the child that replaces it, and the
 * ids of the hidden autodocs entries.
 */
export const getHoistedComponents = (data: IndexHash) => {
  const hoisted: Record<string, string> = {};
  const hiddenIds: string[] = [];

  Object.values(data).forEach((entry) => {
    if (entry.type !== 'component') {
      return;
    }
    const children = (entry.children ?? []).map((id) => data[id]).filter(Boolean);
    const stories = children.filter((child) => child.type === 'story');
    const docs = children.filter((child) => child.type === 'docs');

    if (children.length === 1 && docs.length === 1) {
      hoisted[entry.id] = docs[0].id;
      return;
    }

    const [story] = stories;
    const autodocs = docs.filter((child) => child.tags?.includes('autodocs'));
    if (
      stories.length === 1 &&
      story.type === 'story' &&
      story.subtype === 'story' &&
      docs.length === autodocs.length &&
      children.length === 1 + docs.length &&
      docs.length <= 1 &&
      isStoryHoistable(story.name, entry.name)
    ) {
      hoisted[entry.id] = story.id;
      hiddenIds.push(...docs.map((child) => child.id));
    }
  });

  return { hoisted, hiddenIds };
};
