import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BASE_PATH,
  getChannelPath,
  getChannelUrl,
  joinBasePath,
  normalizeBasePath,
  stripBasePath,
} from './base-path.ts';
import { SERVER_CHANNEL_PATH } from './websocket/index.ts';

describe('normalizeBasePath', () => {
  it.each([
    [undefined, DEFAULT_BASE_PATH],
    ['', ''],
    ['/', ''],
    ['_forkbook', '/_forkbook'],
    ['/_forkbook/', '/_forkbook'],
    ['//a//b//', '/a/b'],
    [' /docs ', '/docs'],
  ])('%j gives %j', (input, expected) => {
    expect(normalizeBasePath(input)).toBe(expected);
  });
});

describe('joinBasePath', () => {
  it('joins with one slash and no trailing slash', () => {
    expect(joinBasePath('/_forkbook', 'index.json')).toBe('/_forkbook/index.json');
    expect(joinBasePath('/_forkbook/', '/index.json')).toBe('/_forkbook/index.json');
    expect(joinBasePath('/_forkbook')).toBe('/_forkbook');
    expect(joinBasePath('/_forkbook', '/')).toBe('/_forkbook');
    expect(joinBasePath('', '')).toBe('/');
    expect(joinBasePath('/', 'a')).toBe('/a');
  });
});

describe('stripBasePath', () => {
  it('removes the base with or without a trailing slash', () => {
    expect(stripBasePath('/_forkbook', '/_forkbook')).toBe('/');
    expect(stripBasePath('/_forkbook', '/_forkbook/')).toBe('/');
    expect(stripBasePath('/_forkbook', '/_forkbook?path=/story/a')).toBe('/?path=/story/a');
    expect(stripBasePath('/_forkbook', '/_forkbook/index.json')).toBe('/index.json');
  });

  it('gives undefined for other paths', () => {
    expect(stripBasePath('/_forkbook', '/index.json')).toBeUndefined();
    expect(stripBasePath('/_forkbook', '/_forkbookx/a')).toBeUndefined();
  });

  it('keeps every path for the root', () => {
    expect(stripBasePath('', '/index.json')).toBe('/index.json');
  });
});

describe('channel path and URL', () => {
  it('puts the channel under the base path', () => {
    expect(getChannelPath('/_forkbook')).toBe('/_forkbook/fb-channel');
    expect(getChannelPath('')).toBe('/fb-channel');
    expect(SERVER_CHANNEL_PATH).toBe(getChannelPath(DEFAULT_BASE_PATH));
  });

  it('makes a WebSocket URL from the page location', () => {
    expect(
      getChannelUrl({
        protocol: 'http:',
        host: 'app.localhost:1355',
        basePath: '/_forkbook',
        token: 'abc',
        page: 'manager',
      })
    ).toBe('ws://app.localhost:1355/_forkbook/fb-channel?token=abc&page=manager');
    expect(getChannelUrl({ protocol: 'https:', host: 'example.com', basePath: '/sb' })).toBe(
      'wss://example.com/sb/fb-channel'
    );
  });
});
