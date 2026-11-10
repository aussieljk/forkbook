import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ALL_STORIES_PATH,
  HOME_PATH,
  buildManagerHref,
  buildStoryPathMap,
  entryUrlPath,
  fromUrlPath,
  getStoryPathEntriesVersion,
  isReservedUrlPath,
  setStoryPathEntries,
  subscribeStoryPathEntries,
  toUrlPath,
  urlPathDepth,
} from './story-paths.ts';

const map = buildStoryPathMap([
  { id: 'example-button--primary', title: 'Example/Button', name: 'Primary', type: 'story' },
  { id: 'example-button--docs', title: 'Example/Button', name: 'Docs', type: 'docs' },
  { id: 'example-button--primary-2', title: 'Example/Button', name: 'Primary', type: 'story' },
  { id: 'settings--about', title: 'Settings', name: 'About', type: 'story' },
]);

describe('story paths', () => {
  it('makes tree URL paths', () => {
    expect(entryUrlPath({ title: 'Example/Button', name: 'Primary' })).toBe(
      '/example/button/primary'
    );
    expect(entryUrlPath({ title: 'Settings', name: 'About' })).toBeUndefined();
    expect(isReservedUrlPath('/all')).toBe(true);
    expect(isReservedUrlPath('/_story/x')).toBe(true);
  });

  it('changes internal paths to URL paths', () => {
    expect(toUrlPath('/story/example-button--primary', map)).toBe('/example/button/primary');
    expect(toUrlPath('/docs/example-button--docs', map)).toBe('/example/button/docs');
    expect(toUrlPath('/story/example-button--primary-2', map)).toBe(
      '/_story/example-button--primary-2'
    );
    expect(toUrlPath('/story/settings--about', map)).toBe('/_story/settings--about');
    expect(toUrlPath('/settings/about', map)).toBe('/settings/about');
    expect(toUrlPath('/', map)).toBe('/');
  });

  it('changes URL paths to internal paths', () => {
    expect(fromUrlPath('/example/button/primary/', map)).toBe('/story/example-button--primary');
    expect(fromUrlPath('/example/button/docs', map)).toBe('/docs/example-button--docs');
    expect(fromUrlPath('/_story/abc--def', map)).toBe('/story/abc--def');
    expect(fromUrlPath('/settings/about', map)).toBe('/settings/about');
    expect(fromUrlPath('/all', map)).toBe('/all/');
    expect(fromUrlPath('/index.html', map)).toBe('/');
    expect(fromUrlPath('/other/thing/one', map)).toBe('/story/other-thing--one');
  });

  it('resolves stories whose name is not the export name', () => {
    const named = buildStoryPathMap([
      {
        id: 'playground-components--table',
        title: 'Playground/Components',
        name: 'Main Table',
        type: 'story',
      },
      {
        id: 'playground-components--default',
        title: 'Playground/Components',
        name: 'Home',
        type: 'story',
      },
      {
        id: 'playground-components--docs',
        title: 'Playground/Components',
        name: 'Docs',
        type: 'docs',
      },
    ]);
    expect(toUrlPath('/story/playground-components--table', named)).toBe(
      '/playground/components/main-table'
    );
    expect(fromUrlPath('/playground/components/main-table', named)).toBe(
      '/story/playground-components--table'
    );
    expect(fromUrlPath('/playground/components/home', named)).toBe(
      '/story/playground-components--default'
    );
    // Old links that use the export name still work.
    expect(fromUrlPath('/playground/components/table', named)).toBe(
      '/story/playground-components--table'
    );
    expect(fromUrlPath('/playground/components/default', named)).toBe(
      '/story/playground-components--default'
    );
  });

  it('tells listeners when the index entries change', () => {
    const calls: number[] = [];
    const unsubscribe = subscribeStoryPathEntries(() => calls.push(getStoryPathEntriesVersion()));
    const before = getStoryPathEntriesVersion();
    setStoryPathEntries([
      {
        id: 'playground-components--table',
        title: 'Playground/Components',
        name: 'Main Table',
        type: 'story',
      },
    ]);
    expect(calls).toEqual([before + 1]);
    expect(fromUrlPath('/playground/components/main-table')).toBe(
      '/story/playground-components--table'
    );
    unsubscribe();
    setStoryPathEntries([]);
    expect(calls).toHaveLength(1);
  });

  it('builds hrefs and depths', () => {
    expect(buildManagerHref('/sb', '/settings/about', 'a=1')).toBe('/sb/settings/about?a=1');
    expect(urlPathDepth('/example/button/primary')).toBe(3);
    expect(urlPathDepth('/')).toBe(0);
  });

  describe('start page and all stories page', () => {
    const root = globalThis as { FORKBOOK_ROOT?: { enabled: boolean } };
    afterEach(() => {
      delete root.FORKBOOK_ROOT;
    });

    it('changes the internal paths to `/` and `/all`', () => {
      expect(toUrlPath(HOME_PATH, map)).toBe('/');
      expect(toUrlPath(ALL_STORIES_PATH, map)).toBe('/all');
      expect(buildManagerHref('/sb/', HOME_PATH)).toBe('/sb/');
      expect(buildManagerHref('/sb/', ALL_STORIES_PATH)).toBe('/sb/all');
    });

    it('opens the start page on `/` only when it is on', () => {
      expect(fromUrlPath('/', map)).toBe('/');
      root.FORKBOOK_ROOT = { enabled: true };
      expect(fromUrlPath('/', map)).toBe(HOME_PATH);
      expect(fromUrlPath('/index.html', map)).toBe(HOME_PATH);
      root.FORKBOOK_ROOT = { enabled: false };
      expect(fromUrlPath('/', map)).toBe('/');
    });

    it('reads `/all` with a trailing slash or capitals', () => {
      expect(fromUrlPath('/all/', map)).toBe(ALL_STORIES_PATH);
      expect(fromUrlPath('/ALL', map)).toBe(ALL_STORIES_PATH);
    });

    it('does not give a story the reserved paths', () => {
      const reserved = buildStoryPathMap([
        { id: 'all--x', title: 'All', name: 'X', type: 'story' },
      ]);
      expect(isReservedUrlPath('/')).toBe(true);
      expect(entryUrlPath({ title: 'All', name: 'X' })).toBe('/all/x');
      expect(toUrlPath('/story/all--x', reserved)).toBe('/all/x');
    });
  });
});

describe('shared story path state', () => {
  it('shares the entries between copies of the module', async () => {
    vi.resetModules();
    // A query makes a second copy of the module, as the manager bundles do.
    // @ts-expect-error TypeScript does not resolve a module path with a query.
    const copy: typeof import('./story-paths.ts') = await import('./story-paths.ts?copy');
    setStoryPathEntries([
      {
        id: 'playground-components--table',
        title: 'Playground/Components',
        name: 'Main Table',
        type: 'story',
      },
    ]);
    expect(copy.fromUrlPath('/playground/components/main-table')).toBe(
      '/story/playground-components--table'
    );
  });
});
