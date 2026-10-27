import type { FC } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ScrollArea, StoryGrid } from '@aussieljk/forkbook/internal/components';
import type { StoryGridComponent } from '@aussieljk/forkbook/internal/components';
import { ALL_STORIES_PATH, HOME_PATH, Route } from '@aussieljk/forkbook/internal/router';
import type { Addon_PageType, IndexEntry } from '@aussieljk/forkbook/internal/types';

import { types, useStorybookApi, useStorybookState } from '@aussieljk/forkbook/manager-api';

import { parseIframeResizeMessage } from '../../../shared/constants/iframe-resize.ts';
import type { RootPageGlobal } from '../../../shared/root-page.ts';
import { groupEntriesByComponent } from '../../../shared/story-grid.ts';
import { getRootPage, thumbnailSrc } from '../../utils/root-page.ts';
import styles from './HomePages.module.css';

const useEntries = (): IndexEntry[] => {
  const { internal_index } = useStorybookState();
  return useMemo(() => Object.values(internal_index?.entries ?? {}), [internal_index]);
};

/** The components for the grid, with thumbnail paths that work at each URL depth. */
const useComponents = (entries: IndexEntry[], mdxImportPath?: string) =>
  useMemo(
    () =>
      groupEntriesByComponent(entries, { hiddenImportPath: mdxImportPath }).map((component) =>
        component.thumbnail
          ? { ...component, thumbnail: thumbnailSrc(component.thumbnail) }
          : component
      ),
    [entries, mdxImportPath]
  );

/** An iframe that takes the height of its content, from the preview resize message. */
export const AutoHeightFrame = ({ src, title }: { src: string; title: string }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) {
        return;
      }
      const size = parseIframeResizeMessage(event.data);
      if (size) {
        setHeight(size.height);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      loading="lazy"
      data-is-storybook-thumbnail="true"
      style={{ width: '100%', height, border: 0 }}
    />
  );
};

export interface HomePageViewProps {
  components: StoryGridComponent[];
  mode: RootPageGlobal['mode'];
  /** The preview `src` of the start page MDX (embed mode), if there is one. */
  mdxSrc?: string;
  getHref: (component: StoryGridComponent) => string;
  onSelect?: (component: StoryGridComponent) => void;
  getPreviewSrc: (storyId: string) => string;
}

/** The start page: the MDX of `root.mdx` (if there is one) and a grid of components. */
export const HomePageView: FC<HomePageViewProps> = ({
  components,
  mode,
  mdxSrc,
  getHref,
  onSelect,
  getPreviewSrc,
}) => (
  <ScrollArea vertical horizontal={false}>
    <div className={styles.page}>
      {mdxSrc ? <AutoHeightFrame src={mdxSrc} title="Start page" /> : null}
      {mdxSrc && mode === 'replace' ? null : (
        <>
          <h1 className={styles.heading}>Components</h1>
          <StoryGrid
            components={components}
            getHref={getHref}
            onSelect={onSelect}
            getPreviewSrc={getPreviewSrc}
          />
        </>
      )}
    </div>
  </ScrollArea>
);

const HomePage = () => {
  const api = useStorybookApi();
  const root = getRootPage();
  const entries = useEntries();
  const components = useComponents(entries, root.mdxImportPath);
  const mdxEntry = root.mdxImportPath
    ? entries.find((entry) => entry.type === 'docs' && entry.importPath === root.mdxImportPath)
    : undefined;
  return (
    <HomePageView
      components={components}
      mode={root.mode}
      mdxSrc={
        mdxEntry
          ? api.getStoryHrefs(mdxEntry.id, { viewMode: 'docs', embed: true }).previewHref
          : undefined
      }
      getHref={(c) => `/${c.viewMode}/${c.entryId}`}
      onSelect={(c) => api.selectStory(c.entryId, undefined, { viewMode: c.viewMode })}
      getPreviewSrc={(id) => api.getStoryHrefs(id, { embed: true }).previewHref}
    />
  );
};

/** How the all stories page renders the stories. */
export type AllStoriesMode = 'one-frame' | 'frame-per-story';

const ALL_STORIES_MODE_KEY = 'forkbook-all-stories-mode';

export const readAllStoriesMode = (): AllStoriesMode => {
  try {
    return window.localStorage.getItem(ALL_STORIES_MODE_KEY) === 'frame-per-story'
      ? 'frame-per-story'
      : 'one-frame';
  } catch {
    return 'one-frame';
  }
};

const writeAllStoriesMode = (mode: AllStoriesMode) => {
  try {
    window.localStorage.setItem(ALL_STORIES_MODE_KEY, mode);
  } catch {
    // The choice is only kept for this visit.
  }
};

const MODES: { mode: AllStoriesMode; title: string }[] = [
  { mode: 'one-frame', title: 'One frame' },
  { mode: 'frame-per-story', title: 'Frame per story' },
];

export interface AllStoriesPageViewProps {
  components: StoryGridComponent[];
  mode: AllStoriesMode;
  onModeChange: (mode: AllStoriesMode) => void;
  /** The preview `src` that renders all stories in one page. */
  allStoriesSrc: string;
  getPreviewSrc: (storyId: string) => string;
}

/** The all stories page: one preview for all stories, or one preview for each story. */
export const AllStoriesPageView: FC<AllStoriesPageViewProps> = ({
  components,
  mode,
  onModeChange,
  allStoriesSrc,
  getPreviewSrc,
}) => (
  <div className={styles.allStories}>
    <div className={styles.toolbar} role="toolbar" aria-label="All stories">
      <div className={styles.switch} role="radiogroup" aria-label="Render mode">
        {MODES.map((item) => (
          <button
            key={item.mode}
            type="button"
            role="radio"
            aria-checked={mode === item.mode}
            className={styles.switchButton}
            onClick={() => onModeChange(item.mode)}
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
    {mode === 'one-frame' ? (
      <iframe
        className={styles.oneFrame}
        src={allStoriesSrc}
        title="All stories"
        data-is-storybook-thumbnail="true"
      />
    ) : (
      <div className={styles.scroll}>
        <ScrollArea vertical horizontal={false}>
          <div className={styles.page}>
            {components.map((c) => (
              <section key={c.title}>
                <h2>{c.title}</h2>
                {c.storyIds.map((id) => (
                  <AutoHeightFrame key={id} title={id} src={getPreviewSrc(id)} />
                ))}
              </section>
            ))}
          </div>
        </ScrollArea>
      </div>
    )}
  </div>
);

/** The preview `src` that renders all stories in one page. */
const allStoriesSrc = (previewHref: string) => {
  const url = previewHref.split('?')[0];
  return `${url}?allStories=true`;
};

const AllStoriesPage = () => {
  const api = useStorybookApi();
  const entries = useEntries();
  const components = useComponents(entries, getRootPage().mdxImportPath).filter(
    (c) => c.storyIds.length > 0
  );
  const [mode, setMode] = useState<AllStoriesMode>(readAllStoriesMode);
  const firstStory = components[0]?.storyIds[0];
  return (
    <AllStoriesPageView
      components={components}
      mode={mode}
      onModeChange={(next) => {
        setMode(next);
        writeAllStoriesMode(next);
      }}
      allStoriesSrc={allStoriesSrc(
        firstStory ? api.getStoryHrefs(firstStory).previewHref : 'iframe.html'
      )}
      getPreviewSrc={(id) => api.getStoryHrefs(id, { embed: true }).previewHref}
    />
  );
};

export const homePageAddon: Addon_PageType = {
  id: 'home',
  url: HOME_PATH,
  title: 'Home',
  type: types.experimental_PAGE,
  render: () => (
    <Route path={HOME_PATH} startsWith>
      <HomePage />
    </Route>
  ),
};

export const allStoriesPageAddon: Addon_PageType = {
  id: 'all-stories',
  url: ALL_STORIES_PATH,
  title: 'All stories',
  type: types.experimental_PAGE,
  render: () => (
    <Route path={ALL_STORIES_PATH} startsWith>
      <AllStoriesPage />
    </Route>
  ),
};
