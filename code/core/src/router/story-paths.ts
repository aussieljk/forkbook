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
 * - `/`: the start page. For now it shows the default story.
 * - `/all`: a future page that shows all stories. For now it is the same as `/`.
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
}

/**
 * Makes the URL paths for all entries. When two entries get the same URL path, the first entry
 * keeps it and the second entry uses `/_story/<id>`.
 */
export const buildStoryPathMap = (entries: Iterable<StoryPathEntry>): StoryPathMap => {
  const map: StoryPathMap = { byId: new Map(), byUrl: new Map() };
  for (const entry of entries) {
    if (entry.type !== 'story' && entry.type !== 'docs') {
      continue;
    }
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

/** Sets the index entries that the URL helpers use. The manager calls this when the index loads. */
export const setStoryPathEntries = (entries: Iterable<StoryPathEntry>) => {
  currentMap = buildStoryPathMap(entries);
};

const storyRouteRegex = /^\/(story|docs)\/(.+)$/;

/**
 * Changes an internal manager path to a URL path.
 *
 * - `/story/example-button--primary` gives `/example/button/primary`.
 * - `/docs/example-button--docs` gives `/example/button/docs`.
 * - `/settings/about` gives `/settings/about`.
 */
export const toUrlPath = (internalPath: string | undefined, map = currentMap): string => {
  if (!internalPath || internalPath === '/') {
    return '/';
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
    return '/';
  }
  const first = firstSegment(path);
  if (APP_ROUTE_SEGMENTS.has(first)) {
    return path;
  }
  const trimmed = trimTrailingSlash(path);
  if (RESERVED_URL_PATHS.includes(trimmed)) {
    return '/';
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
  const viewMode: ViewMode = name === 'docs' ? 'docs' : 'story';
  return `/${viewMode}/${segments.slice(0, -1).join('-')}--${name}`;
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
