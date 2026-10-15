import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeStoriesEntry } from 'storybook/internal/common';

import { subscribe } from '@parcel/watcher';

import { watchStorySpecifiers } from './watch-story-specifiers.ts';

vi.mock('@parcel/watcher', () => ({
  subscribe: vi.fn(async () => ({ unsubscribe: vi.fn() })),
}));

describe('watchStorySpecifiers', () => {
  const workingDir = join(__dirname, '__mockdata__');
  const options = {
    configDir: join(workingDir, '.storybook'),
    workingDir,
  };

  let close: () => Promise<void>;

  afterEach(async () => {
    await close?.();
    vi.mocked(subscribe).mockClear();
  });

  // Send one batch of watcher events, as @parcel/watcher does
  const emit = (...events: ['create' | 'update' | 'delete', string][]) => {
    const onEvents = vi.mocked(subscribe).mock.calls[0][1];
    onEvents(
      null,
      events.map(([type, filename]) => ({ type, path: join(workingDir, filename) }))
    );
  };

  it('watches basic globs', async () => {
    const specifier = normalizeStoriesEntry('../src/**/*.stories.@(ts|js)', options);

    const onInvalidate = vi.fn();
    close = watchStorySpecifiers([specifier], { workingDir }, onInvalidate);

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(join(workingDir, 'src'), expect.any(Function), {
      ignore: ['**/.git', '**/node_modules'],
    });

    // File changed, matching
    onInvalidate.mockClear();
    emit(['update', 'src/nested/Button.stories.ts']);
    expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button.stories.ts`, false);

    // File changed, NOT matching
    onInvalidate.mockClear();
    emit(['update', 'src/nested/Button.ts']);
    expect(onInvalidate).not.toHaveBeenCalled();

    // File removed, matching
    onInvalidate.mockClear();
    emit(['delete', 'src/nested/Button.stories.ts']);
    expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button.stories.ts`, true);

    // File removed, NOT matching
    onInvalidate.mockClear();
    emit(['delete', 'src/nested/Button.ts']);
    expect(onInvalidate).not.toHaveBeenCalled();

    // File renamed, matching
    onInvalidate.mockClear();
    emit(['delete', 'src/nested/Button.stories.ts'], ['create', 'src/nested/Button-2.stories.ts']);
    expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button.stories.ts`, true);
    expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button-2.stories.ts`, false);

    // Many events for one file, the last one wins
    onInvalidate.mockClear();
    emit(['update', 'src/nested/Button.stories.ts'], ['delete', 'src/nested/Button.stories.ts']);
    expect(onInvalidate).toHaveBeenCalledTimes(1);
    expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button.stories.ts`, true);
  });

  it('scans directories when they are added', async () => {
    const specifier = normalizeStoriesEntry('../src/**/*.stories.@(ts|js)', options);

    const onInvalidate = vi.fn();
    close = watchStorySpecifiers([specifier], { workingDir }, onInvalidate);

    emit(['create', 'src/nested']);
    await vi.waitFor(() => {
      expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button.stories.ts`, false);
    });
  });

  it('watches single file globs', async () => {
    const specifier = normalizeStoriesEntry('../src/nested/Button.mdx', options);

    const onInvalidate = vi.fn();
    close = watchStorySpecifiers([specifier], { workingDir }, onInvalidate);

    expect(subscribe).toHaveBeenCalledTimes(1);

    // File changed, matching
    onInvalidate.mockClear();
    emit(['update', 'src/nested/Button.mdx']);
    expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button.mdx`, false);

    // File changed, NOT matching
    onInvalidate.mockClear();
    emit(['update', 'src/nested/Button.tsx']);
    expect(onInvalidate).not.toHaveBeenCalled();

    // File removed, matching
    onInvalidate.mockClear();
    emit(['delete', 'src/nested/Button.mdx']);
    expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button.mdx`, true);
  });

  it('watches a directory once when two specifiers share it', async () => {
    const globSpecifier = normalizeStoriesEntry('../src/**/*.stories.@(ts|js)', options);
    const fileSpecifier = normalizeStoriesEntry('../src/nested/Button.mdx', options);

    const onInvalidate = vi.fn();
    close = watchStorySpecifiers([globSpecifier, fileSpecifier], { workingDir }, onInvalidate);

    expect(subscribe).toHaveBeenCalledTimes(1);

    onInvalidate.mockClear();
    emit(['update', 'src/nested/Button.stories.ts']);
    expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button.stories.ts`, false);

    onInvalidate.mockClear();
    emit(['update', 'src/nested/Button.mdx']);
    expect(onInvalidate).toHaveBeenCalledWith(`./src/nested/Button.mdx`, false);
  });
});
