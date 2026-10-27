import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ScrollArea, StoryGrid } from '@aussieljk/forkbook/internal/components';
import { ALL_STORIES_PATH, HOME_PATH, Route } from '@aussieljk/forkbook/internal/router';
import type { Addon_PageType } from '@aussieljk/forkbook/internal/types';

import { types, useStorybookApi, useStorybookState } from '@aussieljk/forkbook/manager-api';

import { parseIframeResizeMessage } from '../../../shared/constants/iframe-resize.ts';
import { global } from '../../../shared/global.ts';
import type { RootPageGlobal } from '../../../shared/root-page.ts';
import { groupEntriesByComponent } from '../../../shared/story-grid.ts';

const rootPage = (): RootPageGlobal =>
  (global as { FORKBOOK_ROOT?: RootPageGlobal }).FORKBOOK_ROOT ?? {
    enabled: false,
    mode: 'above',
  };

const useComponents = () => {
  const { internal_index } = useStorybookState();
  return useMemo(
    () =>
      groupEntriesByComponent(Object.values(internal_index?.entries ?? {}), {
        hiddenImportPath: rootPage().mdxImportPath,
      }),
    [internal_index]
  );
};

/** An iframe that takes the height of the story, from the preview resize message. */
const AutoHeightFrame = ({ src, title }: { src: string; title: string }) => {
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
      style={{ width: '100%', height, border: 0 }}
    />
  );
};

const HomePage = () => {
  const api = useStorybookApi();
  const components = useComponents();
  return (
    <ScrollArea vertical horizontal={false}>
      <div style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Components</h1>
        <StoryGrid
          components={components}
          getHref={(c) => `/${c.viewMode}/${c.entryId}`}
          onSelect={(c) => api.selectStory(c.entryId, undefined, { viewMode: c.viewMode })}
          getPreviewSrc={(id) => api.getStoryHrefs(id, { embed: true }).previewHref}
        />
      </div>
    </ScrollArea>
  );
};

const AllStoriesPage = () => {
  const api = useStorybookApi();
  const components = useComponents();
  return (
    <ScrollArea vertical horizontal={false}>
      <div style={{ padding: 24 }}>
        {components.map((c) => (
          <section key={c.title}>
            <h2>{c.title}</h2>
            {c.storyIds.map((id) => (
              <AutoHeightFrame
                key={id}
                title={id}
                src={api.getStoryHrefs(id, { embed: true }).previewHref}
              />
            ))}
          </section>
        ))}
      </div>
    </ScrollArea>
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
