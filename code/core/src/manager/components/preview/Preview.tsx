import type { FC } from 'react';
import React, { Fragment, useEffect, useRef, useState } from 'react';

import { Loader } from '@aussieljk/forkbook/internal/components';
import {
  DOCS_PAGE_IN_VIEW,
  PREVIEW_BUILDER_PROGRESS,
  SET_CURRENT_STORY,
} from '@aussieljk/forkbook/internal/core-events';
import type { Addon_WrapperType } from '@aussieljk/forkbook/internal/types';

import { global } from '../../../shared/global.ts';

import { Helmet } from 'react-helmet-async';
import { Consumer, addons, type Combo } from '@aussieljk/forkbook/manager-api';

import { useLandmark } from '../../hooks/useLandmark.ts';
import { isReviewCollectionStoryRoute } from '../../../shared/review/routes.ts';
import { ReviewToolbarHeader } from '../review/components/ReviewToolbarHeader.tsx';
import { FramesRenderer } from './FramesRenderer.tsx';
import { ToolbarComp } from './Toolbar.tsx';
import { ApplyWrappers } from './Wrappers.tsx';
import { ZoomConsumer, ZoomProvider } from './tools/zoom.tsx';
import type { PreviewProps } from './utils/types.tsx';
import styles from './Preview.module.css';

const canvasMapper = ({ state, api }: Combo) => ({
  api,
  storyId: state.storyId,
  refId: state.refId,
  viewMode: state.viewMode,
  customCanvas: api.renderPreview,
  queryParams: state.customQueryParams,
  getElements: api.getElements,
  entry: api.getData(state.storyId, state.refId),
  previewInitialized: state.previewInitialized,
  refs: state.refs,
});

const Preview = React.memo<PreviewProps>(function Preview(props) {
  const {
    api,
    id: previewId,
    options,
    viewMode,
    storyId,
    entry = undefined,
    description,
    baseUrl,
    withLoader = true,
    tools,
    toolsExtra,
    wrappers,
    path,
    queryParams,
  } = props;

  const shouldScale = viewMode === 'story';
  const { showToolbar } = options;
  const customisedShowToolbar = api.getShowToolbarWithCustomisations(showToolbar);
  const isReviewCollectionStory = isReviewCollectionStoryRoute(path, queryParams);

  const previousStoryId = useRef(storyId);

  useEffect(() => {
    if (entry && viewMode) {
      // Don't emit the event on first ("real") render, only when entry changes
      if (storyId === previousStoryId.current) {
        return;
      }

      previousStoryId.current = storyId;

      if (viewMode.match(/docs|story/)) {
        const { refId, id } = entry;
        api.emit(SET_CURRENT_STORY, {
          storyId: id,
          viewMode,
          options: { target: refId },
        });
      }
    }
  }, [entry, viewMode, storyId, api]);

  // Infinite docs scroll: the sidebar and the URL follow the docs page in view. The preview has
  // that page already, so the new selection is not sent back to it.
  useEffect(() => {
    const onDocsPageInView = ({ storyId: id }: { storyId: string }) => {
      if (viewMode !== 'docs') {
        return;
      }
      previousStoryId.current = id;
      const params = new URLSearchParams(global.window.location.search);
      params.set('path', `/docs/${id}`);
      api.navigateUrl(`?${params.toString().replaceAll('%2F', '/')}`, { replace: true });
    };
    api.on(DOCS_PAGE_IN_VIEW, onDocsPageInView);
    return () => api.off(DOCS_PAGE_IN_VIEW, onDocsPageInView);
  }, [api, viewMode]);

  const mainRef = useRef<HTMLElement>(null);
  const { landmarkProps } = useLandmark(
    { 'aria-labelledby': 'main-preview-heading', role: 'main' },
    mainRef
  );

  return (
    <Fragment>
      {previewId === 'main' && (
        <Helmet key="description">
          <title>{description}</title>
        </Helmet>
      )}
      <ZoomProvider shouldScale={shouldScale}>
        <div className={styles.previewContainer}>
          {customisedShowToolbar && isReviewCollectionStory ? <ReviewToolbarHeader /> : null}
          <ToolbarComp
            key="tools"
            isShown={customisedShowToolbar}
            tools={tools}
            toolsExtra={toolsExtra}
          />
          <main className={styles.frameWrap} ref={mainRef} {...landmarkProps}>
            <h2 id="main-preview-heading" className="fb-sr-only">
              Main preview area
            </h2>
            <div className={styles.canvasWrap}>
              <Canvas {...{ withLoader, baseUrl }} wrappers={wrappers} />
            </div>
          </main>
        </div>
      </ZoomProvider>
    </Fragment>
  );
});

export { Preview };

const Canvas: FC<{
  withLoader: boolean;
  baseUrl: string;
  children?: never;
  wrappers: Addon_WrapperType[];
}> = ({ baseUrl, withLoader, wrappers }) => {
  return (
    <Consumer filter={canvasMapper}>
      {({
        api,
        entry,
        refs,
        customCanvas,
        storyId,
        refId,
        viewMode,
        queryParams,
        previewInitialized,
      }) => {
        const id = 'canvas';

        const [progress, setProgress] = useState(undefined);
        useEffect(() => {
          if (global.CONFIG_TYPE === 'DEVELOPMENT') {
            try {
              const channel = addons.getChannel();

              channel.on(PREVIEW_BUILDER_PROGRESS, (options) => {
                setProgress(options);
              });
            } catch {
              //
            }
          }
        }, []);
        // A ref simply depends on its readiness
        // @ts-expect-error (non strict)
        const refLoading = !!refs[refId] && !refs[refId].previewInitialized;
        // The root also might need to wait on webpack
        // @ts-expect-error (non strict)
        const isBuilding = !(progress?.value === 1 || progress === undefined);
        const rootLoading = !refId && (!previewInitialized || isBuilding);
        const isLoading = entry ? refLoading || rootLoading : rootLoading;

        return (
          <ZoomConsumer>
            {({ value: scale }) => {
              return (
                <>
                  {withLoader && isLoading && (
                    <div className={styles.loaderWrapper}>
                      <Loader id="preview-loader" role="progressbar" progress={progress} />
                    </div>
                  )}
                  <ApplyWrappers id={id} storyId={storyId} viewMode={viewMode} wrappers={wrappers}>
                    {customCanvas ? (
                      customCanvas(storyId, viewMode, id, baseUrl, scale, queryParams)
                    ) : (
                      <FramesRenderer
                        api={api}
                        refs={refs}
                        scale={scale}
                        entry={entry}
                        viewMode={viewMode}
                        // @ts-expect-error (non strict)
                        refId={refId}
                        queryParams={queryParams}
                        storyId={storyId}
                      />
                    )}
                  </ApplyWrappers>
                </>
              );
            }}
          </ZoomConsumer>
        );
      }}
    </Consumer>
  );
};
