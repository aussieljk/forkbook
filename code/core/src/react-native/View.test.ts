import { describe, expect, it, vi } from 'vitest';
import type { SelectionStore } from '@aussieljk/forkbook/internal/preview-api';
import { View } from './View.tsx';

import type { Channel } from '@aussieljk/forkbook/internal/channels';
import type { PreviewWithSelection } from '@aussieljk/forkbook/internal/preview-api';
import type { ReactRenderer } from '@aussieljk/forkbook/react';
import type { StoryIndex } from '@aussieljk/forkbook/internal/types';
vi.mock('@aussieljk/forkbook/manager-api', () => ({
  addons: {
    loadAddons: vi.fn(),
    setChannel: vi.fn(),
  },
}));

describe('View story selection persistence', () => {
  const createView = () => {
    const selectionStore = {
      selectionSpecifier: null,
      setQueryParams: vi.fn(),
    } as unknown as SelectionStore;

    selectionStore.setSelection = vi.fn((selection) => {
      selectionStore.selection = selection;
    });

    const preview = {
      selectionStore,
      selectSpecifiedStory: vi.fn(async () => {
        if (selectionStore.selection) return;

        const storySpecifier = selectionStore.selectionSpecifier?.storySpecifier;
        const storyId = storySpecifier === '*' ? 'first--story' : String(storySpecifier);

        selectionStore.setSelection({ storyId, viewMode: 'story' });
      }),
    };

    // The preview and the channel are mocks with only what the selection code uses.
    const view = new View(
      preview as unknown as PreviewWithSelection<ReactRenderer>,
      {} as Channel,
      {}
    );
    view._storyIndex = {
      entries: {
        'first--story': { id: 'first--story', type: 'story' },
        'second--story': { id: 'second--story', type: 'story' },
      },
    } as unknown as StoryIndex;

    return { preview, selectionStore, view };
  };

  it('applies the initial story even when the preview already has a selection', async () => {
    const { preview, selectionStore, view } = createView();

    selectionStore.selection = { storyId: 'first--story', viewMode: 'story' };

    await view._selectInitialStory({
      selectionSpecifier: { storySpecifier: 'second--story', viewMode: 'story' },
    });

    expect(preview.selectSpecifiedStory).toHaveBeenCalledTimes(1);
    expect(selectionStore.selection).toEqual({ storyId: 'second--story', viewMode: 'story' });
  });

  it('prefers an initial URL story over the persisted selection', async () => {
    const { selectionStore, view } = createView();

    await view._selectInitialStory({
      selectionSpecifier: { storySpecifier: 'second--story', viewMode: 'story' },
      storyIdFromUrl: 'first--story',
    });

    expect(selectionStore.selection).toEqual({ storyId: 'first--story', viewMode: 'story' });
  });
});
