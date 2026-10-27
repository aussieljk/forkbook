import React, { useState } from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import type { StoryGridComponent } from '@aussieljk/forkbook/internal/components';
import { expect, fn, userEvent, within } from '@aussieljk/forkbook/test';

import type { AllStoriesMode } from './HomePages.tsx';
import { AllStoriesPageView, HomePageView } from './HomePages.tsx';

const page = (text: string) =>
  `data:text/html,${encodeURIComponent(`<body style="font-family:sans-serif">${text}</body>`)}`;

const swatch = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#ff4785"/></svg>'
)}`;

const components: StoryGridComponent[] = [
  {
    title: 'Example/Button',
    name: 'Button',
    entryId: 'example-button--docs',
    viewMode: 'docs',
    firstStoryId: 'example-button--primary',
    storyIds: ['example-button--primary', 'example-button--secondary'],
    thumbnail: swatch,
  },
  {
    title: 'Example/Header',
    name: 'Header',
    entryId: 'example-header--logged-in',
    viewMode: 'story',
    firstStoryId: 'example-header--logged-in',
    storyIds: ['example-header--logged-in'],
  },
];

const getPreviewSrc = (id: string) => page(`Story ${id}`);

const homeMeta = {
  component: HomePageView,
  title: 'Home/HomePages',
  parameters: { layout: 'fullscreen' },
  decorators: [(storyFn) => <div style={{ height: 600 }}>{storyFn()}</div>],
  args: {
    components,
    mode: 'above',
    getHref: (c: StoryGridComponent) => `/${c.viewMode}/${c.entryId}`,
    onSelect: fn(),
    getPreviewSrc,
  },
} satisfies Meta<typeof HomePageView>;

export default homeMeta;

type HomeStory = StoryObj<typeof homeMeta>;

export const Grid: HomeStory = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Components' })).toBeVisible();
    await userEvent.click(canvas.getByText('Button'));
    await expect(args.onSelect).toHaveBeenCalledWith(components[0]);
  },
};

export const MdxAbove: HomeStory = {
  args: { mdxSrc: page('<h1>Welcome</h1>') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTitle('Start page')).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Components' })).toBeVisible();
  },
};

export const MdxReplace: HomeStory = {
  args: { mdxSrc: page('<h1>Welcome</h1>'), mode: 'replace' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTitle('Start page')).toBeInTheDocument();
    await expect(canvas.queryByRole('heading', { name: 'Components' })).toBeNull();
  },
};

const AllStories = ({ initialMode }: { initialMode: AllStoriesMode }) => {
  const [mode, setMode] = useState(initialMode);
  return (
    <AllStoriesPageView
      components={components}
      mode={mode}
      onModeChange={setMode}
      allStoriesSrc={page('All stories in one frame')}
      getPreviewSrc={getPreviewSrc}
    />
  );
};

export const AllStoriesOneFrame: StoryObj = {
  render: () => <AllStories initialMode="one-frame" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('radio', { name: 'One frame' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(canvasElement.querySelectorAll('iframe')).toHaveLength(1);
    await userEvent.click(canvas.getByRole('radio', { name: 'Frame per story' }));
    await expect(canvasElement.querySelectorAll('iframe')).toHaveLength(3);
  },
};

export const AllStoriesFramePerStory: StoryObj = {
  render: () => <AllStories initialMode="frame-per-story" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Example/Button' })).toBeVisible();
    await expect(canvasElement.querySelectorAll('iframe')).toHaveLength(3);
  },
};
