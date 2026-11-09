/**
 * Manager URLs follow the sidebar tree: the story "Primary" of "Example/Button" is at
 * `/example/button/primary`, and its docs are at `/example/button/docs`.
 *
 * The manager keeps an internal path (`/story/<id>`, `/docs/<id>`, `/settings/about`, `/review/`).
 * The helpers here change an internal path to a URL path and back. A URL path does not include the
 * base path where Forkbook is hosted.
 *
 * Reserved URL paths:
 *
 * - `/`: the start page (internal path `/home/`). With `root: false` in the main config, `/` opens
 *   the first story (internal path `/`).
 * - `/all`: the page that shows all stories (internal path `/all/`).
 * - `/settings/...` and `/review...`: manager pages.
 * - `/_story/<id>` and `/_docs/<id>`: a story that has no tree path, for example a story from a
 *   composed ref, a story whose tree path is reserved, or a story that is not in the index yet.
 */
import { sanitize } from '../csf/csf-utils.ts';

export interface StoryPathEntry {
  id: string;
  title: string;
  name: string;
  type: string;
}

type ViewMode = 'story' | 'docs';

/** First URL segments that the manager uses for its own pages. */
const APP_ROUTE_SEGMENTS = new Set(['settings', 'review']);

/** The internal path of the start page. */
export const HOME_PATH = '/home/';

/** The internal path of the page that shows all stories. */
export const ALL_STORIES_PATH = '/all/';

/** True when the start page is on. The server sets `FORKBOOK_ROOT` from `root` in the main config. */
const isRootPageEnabled = () =>
  (globalThis as { FORKBOOK_ROOT?: { enabled?: boolean } }).FORKBOOK_ROOT?.enabled === true;

/** URL paths that no story can have. */
export const RESERVED_URL_PATHS = ['/', '/all'];

const firstSegment = (path: string) => path.split('/').filter(Boolean)[0] ?? '';

/** True when no story can use this URL path. */
export const isReservedUrlPath = (urlPath: string): boolean => {
  const path = trimTrailingSlash(urlPath.toLowerCase());
  if (RESERVED_URL_PATHS.includes(path)) {
    return true;
  }
  const first = firstSegment(path);
  return APP_ROUTE_SEGMENTS.has(first) || first.startsWith('_');
};

const trimTrailingSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

/**
 * The tree URL path of an index entry, or `undefined` when the entry cannot have one (the path is
 * reserved, or it has fewer than two segments).
 */
export const entryUrlPath = (entry: Pick<StoryPathEntry, 'title' | 'name'>): string | undefined => {
  const segments = [...entry.title.split('/'), entry.name].map(sanitize).filter(Boolean);
  if (segments.length < 2) {
    return undefined;
  }
  const path = `/${segments.join('/')}`;
  return isReservedUrlPath(path) ? undefined : path;
};

interface StoryPathMap {
  byId: Map<string, string>;
  byUrl: Map<string, { id: string; viewMode: ViewMode }>;
  /** The view mode of every story and docs entry in the index, by ID. */
  entries: Map<string, ViewMode>;
}

/**
 * Makes the URL paths for all entries. When two entries get the same URL path, the first entry
 * keeps it and the second entry uses `/_story/<id>`.
 */
export const buildStoryPathMap = (entries: Iterable<StoryPathEntry>): StoryPathMap => {
  const map: StoryPathMap = { byId: new Map(), byUrl: new Map(), entries: new Map() };
  for (const entry of entries) {
    if (entry.type !== 'story' && entry.type !== 'docs') {
      continue;
    }
    map.entries.set(entry.id, entry.type === 'docs' ? 'docs' : 'story');
    const urlPath = entryUrlPath(entry);
    if (!urlPath || map.byUrl.has(urlPath)) {
      continue;
    }
    map.byId.set(entry.id, urlPath);
    map.byUrl.set(urlPath, { id: entry.id, viewMode: entry.type === 'docs' ? 'docs' : 'story' });
  }
  return map;
};

let currentMap: StoryPathMap = buildStoryPathMap([]);
let mapVersion = 0;
const listeners = new Set<() => void>();

/** Sets the index entries that the URL helpers use. The manager calls this when the index loads. */
export const setStoryPathEntries = (entries: Iterable<StoryPathEntry>) => {
  currentMap = buildStoryPathMap(entries);
  mapVersion += 1;
  listeners.forEach((listener) => listener());
};

/**
 * Calls the listener when the index entries change. The result of {@link fromUrlPath} can change
 * then, so a component that reads the URL path must render again. Returns an unsubscribe function.
 */
export const subscribeStoryPathEntries = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** A number that changes each time the index entries change. */
export const getStoryPathEntriesVersion = () => mapVersion;

const storyRouteRegex = /^\/(story|docs)\/(.+)$/;

/**
 * Changes an internal manager path to a URL path.
 *
 * - `/story/example-button--primary` gives `/example/button/primary`.
 * - `/docs/example-button--docs` gives `/example/button/docs`.
 * - `/settings/about` gives `/settings/about`.
 */
export const toUrlPath = (internalPath: string | undefined, map = currentMap): string => {
  if (!internalPath || internalPath === '/' || internalPath === HOME_PATH) {
    return '/';
  }
  if (internalPath === ALL_STORIES_PATH) {
    return '/all';
  }
  const match = internalPath.match(storyRouteRegex);
  if (!match) {
    return internalPath;
  }
  const [, viewMode, id] = match;
  const urlPath = map.byId.get(id);
  if (urlPath && map.byUrl.get(urlPath)?.viewMode === viewMode) {
    return urlPath;
  }
  return `/_${viewMode}/${id}`;
};

/**
 * Changes a URL path to an internal manager path. This is the opposite of {@link toUrlPath}.
 *
 * When the index has not loaded, the path segments give the story ID: `/example/button/primary`
 * gives `example-button--primary`. A last segment of `docs` gives the docs view.
 */
export const fromUrlPath = (urlPath: string | undefined, map = currentMap): string => {
  let path = urlPath || '/';
  try {
    path = decodeURI(path);
  } catch {
    // Keep the path as it is.
  }
  path = path.toLowerCase();
  if (path === '/index.html') {
    path = '/';
  }
  const first = firstSegment(path);
  if (APP_ROUTE_SEGMENTS.has(first)) {
    return path;
  }
  const trimmed = trimTrailingSlash(path);
  if (trimmed === '/all') {
    return ALL_STORIES_PATH;
  }
  if (trimmed === '/') {
    return isRootPageEnabled() ? HOME_PATH : '/';
  }
  const escaped = trimmed.match(/^\/_(story|docs)\/(.+)$/);
  if (escaped) {
    return `/${escaped[1]}/${escaped[2]}`;
  }
  const known = map.byUrl.get(trimmed);
  if (known) {
    return `/${known.viewMode}/${known.id}`;
  }
  const segments = trimmed.split('/').filter(Boolean);
  if (segments.length < 2) {
    return '/';
  }
  const name = segments[segments.length - 1];
  const guessedId = `${segments.slice(0, -1).join('-')}--${name}`;
  // An old link can use the export name (the story ID) and not the story name. When the index has
  // an entry with this ID, use its view mode.
  const indexed = map.entries.get(guessedId);
  if (indexed) {
    return `/${indexed}/${guessedId}`;
  }
  const viewMode: ViewMode = name === 'docs' ? 'docs' : 'story';
  return `/${viewMode}/${guessedId}`;
};

/**
 * Builds a manager href from a base (for example `/` or `https://host/sb/`), an internal path and a
 * query string without the leading `?`.
 */
export const buildManagerHref = (base: string, internalPath: string, query = ''): string => {
  const root = base.endsWith('/') ? base : `${base}/`;
  const urlPath = toUrlPath(internalPath).slice(1);
  return `${root}${urlPath}${query ? `?${query}` : ''}`;
};

/** Number of path segments in a URL path. A page at this path uses it to find its base path. */
export const urlPathDepth = (urlPath: string): number => urlPath.split('/').filter(Boolean).length;
