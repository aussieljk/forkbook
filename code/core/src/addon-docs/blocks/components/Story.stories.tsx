import type { ComponentType } from 'react';
import React from 'react';

import type { Channel } from '@aussieljk/forkbook/internal/channels';
import {
  RESET_STORY_ARGS,
  STORY_ARGS_UPDATED,
  UPDATE_STORY_ARGS,
} from '@aussieljk/forkbook/internal/core-events';
import type { PlayFunctionContext } from '@aussieljk/forkbook/internal/csf';
import type { ModuleExport, WebRenderer } from '@aussieljk/forkbook/internal/types';

import type { Meta, ReactRenderer, StoryObj } from '@aussieljk/forkbook/react-vite';

import type { PreviewWeb } from '@aussieljk/forkbook/preview-api';
import { within } from '@aussieljk/forkbook/test';

import type { DocsContextProps } from '../blocks/index.ts';
import * as ButtonStories from '../examples/Button.stories.tsx';
import type { StoryProps } from './Story.tsx';
import { Story as StoryComponent, StorySkeleton } from './Story.tsx';

// The preview sets these globals before stories run.
const preview = globalThis.__FORKBOOK_PREVIEW__ as PreviewWeb<ReactRenderer>;
const channel = globalThis.__FORKBOOK_ADDONS_CHANNEL__ as Channel;
const renderStoryToElement = preview.renderStoryToElement.bind(preview);

/**
 * The args of these stories. `StoryProps` is a union of the inline and iframe props, so the args
 * list the fields of both, and the render function passes them on as `StoryProps`.
 */
type ExtendedStoryProps = {
  storyExport: ModuleExport;
  inline?: boolean;
  height?: string;
  primary?: boolean;
  autoplay?: boolean;
  forceInitialArgs?: boolean;
  renderStoryToElement?: DocsContextProps['renderStoryToElement'];
};

const meta = {
  // The args name the story as `storyExport`, and the render function resolves it to `story`.
  component: StoryComponent as unknown as ComponentType<ExtendedStoryProps>,
  parameters: {
    layout: 'fullscreen',
    relativeCsfPaths: ['../examples/Button.stories'],
  },
  globals: { sb_theme: 'light' },
  args: {
    height: '100px',
    primary: false,
    // NOTE: the real story arg is a PreparedStory, which we'll get in the render function below
    storyExport: ButtonStories.Primary,
  },
  render({ storyExport, ...args }, { loaded }) {
    const docsContext = loaded.docsContext as DocsContextProps;
    const resolved = docsContext.resolveOf(storyExport, ['story']);
    return <StoryComponent {...({ ...args, story: resolved.story } as StoryProps)} />;
  },
} satisfies Meta<ExtendedStoryProps>;
export default meta;

type Story = StoryObj<Meta<ExtendedStoryProps>>;

export const Loading = {
  globals: { sb_theme: 'side-by-side' },
  render: () => <StorySkeleton />,
};

export const Inline: Story = {
  args: {
    inline: true,
    autoplay: false,
    forceInitialArgs: false,
    renderStoryToElement,
  },
};

export const InlineError: Story = {
  args: {
    storyExport: ButtonStories.ErrorStory,
    inline: true,
    autoplay: false,
    forceInitialArgs: false,
    renderStoryToElement,
  },
};

export const IFrame: Story = {
  name: 'IFrame',
  args: {
    inline: false,
  },
};

export const ForceInitialArgs = {
  args: {
    storyExport: ButtonStories.Primary,
    inline: true,
    autoplay: true,
    forceInitialArgs: true,
    renderStoryToElement,
  },
  parameters: {
    chromatic: { disableSnapshot: true },
  },
  // test that it ignores updated args by emitting an arg update and assert that it isn't reflected in the DOM
  play: async ({ args, canvasElement, loaded }: PlayFunctionContext<WebRenderer>) => {
    const docsContext = loaded.docsContext as DocsContextProps;
    const resolved = docsContext.resolveOf(args.storyExport, ['story']);

    await within(canvasElement).findByText(/Button/);

    const updatedPromise = new Promise<void>((resolve) => {
      channel.once(STORY_ARGS_UPDATED, resolve);
    });
    await channel.emit(UPDATE_STORY_ARGS, {
      storyId: resolved.story.id,
      updatedArgs: { label: 'Updated' },
    });
    await updatedPromise;
    await within(canvasElement).findByText(/Button/);

    await channel.emit(RESET_STORY_ARGS, { storyId: resolved.story.id });
    await new Promise<void>((resolve) => {
      channel.once(STORY_ARGS_UPDATED, resolve);
    });
  },
};

export const Autoplay: Story = {
  args: {
    storyExport: ButtonStories.Clicking,
    inline: true,
    autoplay: true,
    renderStoryToElement,
  },
};
