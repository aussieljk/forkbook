import type { FC } from 'react';
import React, { Fragment, useRef } from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';

import type { Combo } from '@aussieljk/forkbook/manager-api';
import { Consumer } from '@aussieljk/forkbook/manager-api';

import { Viewport } from './Viewport.tsx';
import type { FramesRendererProps } from './utils/types.tsx';
import styles from './FramesRenderer.module.css';

const getActive = (refId: FramesRendererProps['refId'], refs: FramesRendererProps['refs']) => {
  if (refId && refs[refId]) {
    return `storybook-ref-${refId}`;
  }

  return 'storybook-preview-iframe';
};

const whenSidebarIsVisible = ({ api, state }: Combo) => ({
  isFullscreen: api.getIsFullscreen(),
  isNavShown: api.getNavAvailability() === 'shown',
  selectedStoryId: state.storyId,
});

// Shows only the active preview iframe.
const framesCss = `
#root [data-is-storybook="false"] {
  display: none;
}
#root [data-is-storybook="true"] {
  display: block;
}
`;

export const FramesRenderer: FC<FramesRendererProps> = ({
  api,
  refs,
  scale,
  viewMode = 'story',
  refId,
  queryParams = {},
  storyId = '*',
}) => {
  const version = refs[refId]?.version;
  const active = getActive(refId, refs);
  const { current: frames } = useRef<Record<string, string>>({});

  const refsToLoad = Object.values(refs).filter((ref) => {
    return ref.type === 'auto-inject' || ref.id === refId;
  }, {});

  if (!frames['storybook-preview-iframe']) {
    // The local preview iframe must always use the host's own URL, so pass `refId: undefined`
    // explicitly. Passing the current story's `refId` makes getStoryHrefs return the composed
    // ref's iframe URL, and since this is only set once, the local frame would stay stuck on
    // the ref's Forkbook when a ref story is loaded first (#34553).
    frames['storybook-preview-iframe'] = api.getStoryHrefs(storyId, {
      queryParams: { ...queryParams, ...(version && { version }) },
      refId: undefined,
      viewMode,
    }).previewHref;
  }

  refsToLoad.forEach((ref) => {
    const id = `storybook-ref-${ref.id}`;
    if (!frames[id]?.startsWith(`${ref.url.replace(/\/?$/, '/')}iframe.html`)) {
      frames[id] = api.getStoryHrefs(storyId, {
        queryParams: { ...queryParams, ...(version && { version }) },
        refId: ref.id,
        viewMode,
      }).previewHref;
    }
  });

  return (
    <Fragment>
      <style>{framesCss}</style>
      <Consumer filter={whenSidebarIsVisible}>
        {({ isFullscreen, isNavShown, selectedStoryId }) => {
          if (isFullscreen || !isNavShown || !selectedStoryId) {
            return null;
          }
          return (
            <Button className={styles.skipToSidebarLink} ariaLabel={false} asChild>
              <a href={`#${selectedStoryId}`} tabIndex={0}>
                Skip to sidebar
              </a>
            </Button>
          );
        }}
      </Consumer>
      {Object.entries(frames).map(([id, src]) => (
        <Viewport key={id} id={id} src={src} active={id === active} scale={scale} />
      ))}
    </Fragment>
  );
};
