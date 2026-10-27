import { describe, expect, it } from 'vitest';

import {
  buildManagerHref,
  buildStoryPathMap,
  entryUrlPath,
  fromUrlPath,
  isReservedUrlPath,
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
    expect(fromUrlPath('/all', map)).toBe('/');
    expect(fromUrlPath('/index.html', map)).toBe('/');
    expect(fromUrlPath('/other/thing/one', map)).toBe('/story/other-thing--one');
  });

  it('builds hrefs and depths', () => {
    expect(buildManagerHref('/sb', '/settings/about', 'a=1')).toBe('/sb/settings/about?a=1');
    expect(urlPathDepth('/example/button/primary')).toBe(3);
    expect(urlPathDepth('/')).toBe(0);
  });
});
