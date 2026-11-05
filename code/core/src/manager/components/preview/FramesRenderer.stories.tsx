import type { ComponentProps } from 'react';

import type { API_LeafEntry, API_Refs } from '@aussieljk/forkbook/internal/types';
import { type API, ManagerContext } from '@aussieljk/forkbook/manager-api';
import { expect, fn } from '@aussieljk/forkbook/test';

import preview from '../../../../../.forkbook/preview.tsx';
import { FramesRenderer } from './FramesRenderer.tsx';

/** A manager context with only the state and API that these stories use. */
type ManagerContextValue = ComponentProps<typeof ManagerContext.Provider>['value'];

// Use the `Icons` composed ref that this Forkbook already references, so the active ref frame
// renders a real story instead of a non-existent URL.
const refId = 'icons';
const refUrl = 'https://main--64b56e737c0aeefed9d5e675.chromatic.com';
const storyId = 'icons-accessibilityicon--default';

// getStoryHrefs returns the composed ref's iframe URL whenever a refId is passed, so we can
// assert the local preview frame is requested without one (mirrors manager-api/url.ts).
const getStoryHrefs = fn((id: string, opts?: { refId?: string }) => ({
  managerHref: '',
  previewHref: opts?.refId
    ? `${refUrl}/iframe.html?id=${id}&refId=${opts.refId}`
    : `iframe.html?id=${id}`,
})).mockName('api::getStoryHrefs');

const api = {
  getStoryHrefs,
  getIsFullscreen: fn(() => false),
  getIsNavShown: fn(() => true),
  getNavAvailability: fn(() => 'shown'),
  getCurrentParameter: fn(() => undefined),
  getGlobals: fn(() => ({})),
  getStoryGlobals: fn(() => ({})),
  getUserGlobals: fn(() => ({})),
  getUrlState: fn(() => ({ viewMode: 'story' })),
  updateGlobals: fn(),
  setAddonShortcut: fn(),
  on: fn(),
  off: fn(),
  emit: fn(),
};

const managerContext = {
  state: { storyId },
  api,
};

const meta = preview.meta({
  component: FramesRenderer,
  args: {
    api: api as unknown as API,
    refId,
    storyId,
    viewMode: 'story',
    scale: 1,
    queryParams: {},
    entry: { type: 'story', id: storyId } as API_LeafEntry,
    refs: {
      [refId]: {
        id: refId,
        url: refUrl,
        type: 'lazy',
        title: 'Icons',
        previewInitialized: false,
      },
    } satisfies API_Refs,
  },
  decorators: [
    (Story) => (
      <ManagerContext.Provider value={managerContext as unknown as ManagerContextValue}>
        <Story />
      </ManagerContext.Provider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
});

/**
 * Regression test for #34553: when a composed-ref story is the initial selection, the local
 * preview frame must still point at the host's own iframe URL. Otherwise the local frame
 * stays stuck on the ref's Forkbook (it is only set once) and host stories never render.
 */
export const RefStoryKeepsLocalPreviewOnHost = meta.story({
  play: async ({ canvasElement }) => {
    const localFrame = canvasElement.querySelector<HTMLIFrameElement>('#storybook-preview-iframe');
    await expect(localFrame).not.toBeNull();

    const src = localFrame?.getAttribute('src') ?? '';
    await expect(src).not.toContain(refUrl);
    await expect(src).toContain(`iframe.html?id=${storyId}`);
  },
});
