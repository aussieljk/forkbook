import React, { type CSSProperties, type FC } from 'react';

import { Badge, Button, Loader } from 'storybook/internal/components';

import { clsx } from 'clsx';

import {
  hasFixedViewportDimensions,
  type IframeResizeDimensions,
} from '../../../../shared/constants/iframe-resize.ts';
import { fallbackStoryInfo, type StoryInfo } from '../review-types.ts';
import { usePreviewThumbnail } from './usePreviewThumbnail.ts';
import styles from './CollectionGrid.module.css';

/** Pre-measurement scale so the embed iframe viewport is 2× the frame width (100% / 0.5). */
const THUMBNAIL_BOOTSTRAP_SCALE = 0.5;

// Feeds the CSS variables consumed by `.frame` in CollectionGrid.module.css (`--scale`, `--content-w`,
// `--vp-w`/`--vp-h`); `viewportFill` toggles the `data-viewport-fill` branch.
const getPreviewFrameLayout = (
  dimensions: IframeResizeDimensions | null
): { style: CSSProperties; viewportFill: boolean } => {
  if (!dimensions) {
    return {
      style: { '--scale': THUMBNAIL_BOOTSTRAP_SCALE } as CSSProperties,
      viewportFill: false,
    };
  }

  if (hasFixedViewportDimensions(dimensions.viewport)) {
    return {
      style: {
        '--vp-w': dimensions.viewport.width,
        '--vp-h': dimensions.viewport.height,
      } as CSSProperties,
      viewportFill: true,
    };
  }

  return { style: { '--content-w': dimensions.width } as CSSProperties, viewportFill: false };
};

const deriveStoryInfo = (info: StoryInfo): { component: string; name: string } => ({
  component: info.title.split('/').pop() ?? info.title,
  name: info.name,
});

const StoryPreviewCell: FC<{
  storyId: string;
  href?: string;
  info: StoryInfo;
  getPreviewHref: (storyId: string) => string;
  summaryHidden?: boolean;
}> = ({ storyId, href, info, getPreviewHref, summaryHidden = false }) => {
  const {
    cellRef,
    iframeRef,
    src,
    isPreviewLoading,
    rememberedDimensions,
    forceStartCurrent,
    finishCurrent,
  } = usePreviewThumbnail({ storyId, getPreviewHref, summaryHidden });

  const { component, name } = deriveStoryInfo(info);
  const readableTitle = `${component} – ${name}`;
  const { style: frameStyle, viewportFill } = getPreviewFrameLayout(rememberedDimensions);
  const FrameElement = href ? 'a' : 'div';

  const preview = src ? (
    <div data-preview-scale>
      <iframe
        className={styles.preview}
        ref={iframeRef}
        data-is-storybook-thumbnail
        title={readableTitle}
        src={src}
        data-content-width={rememberedDimensions?.width}
        data-content-height={rememberedDimensions?.height}
        tabIndex={-1}
        scrolling="no"
        onLoad={finishCurrent}
        onError={finishCurrent}
      />
    </div>
  ) : null;

  return (
    <div
      className={styles.cell}
      ref={cellRef}
      role="listitem"
      data-cell
      data-testid="review-collection-grid-cell"
    >
      <div className={styles.frameShell}>
        <FrameElement
          className={styles.frame}
          {...(href ? { href } : {})}
          data-testid="review-collection-grid-frame"
          data-viewport-fill={viewportFill || undefined}
          style={frameStyle}
          aria-label={href ? `Review story ${readableTitle}` : undefined}
          onMouseEnter={forceStartCurrent}
          onFocus={forceStartCurrent}
        >
          {isPreviewLoading ? (
            <div className={styles.previewLoading} data-testid="review-preview-loading">
              <Loader />
            </div>
          ) : null}
          {preview}
        </FrameElement>
      </div>
      <div className={styles.actionBar}>
        <div className={styles.label}>
          <span className={styles.labelComponent}>{component}</span>
          <span className={styles.labelSeparator}>/</span>
          <span className={styles.labelStory}>{name}</span>
          {info.changeStatus === 'new' || info.isNewlyAdded ? (
            <Badge status="positive" compact>
              New
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export interface CollectionGridProps {
  storyIds: string[];
  getStoryHref?: (storyId: string, storyIndex: number) => string | undefined;
  /** Builds the (frozen) preview iframe src for a story thumbnail. */
  getStoryPreviewHref: (storyId: string) => string;
  /** Persisted "review all" state from the parent list. */
  showAll?: boolean;
  /** Called when the user expands to "Review all". */
  onShowAll?: () => void;
  /** Story id → component title + story name, for the cell label. */
  storyInfo: Record<string, StoryInfo>;
  /** Keep loaded previews mounted while the summary overlay is hidden. */
  summaryHidden?: boolean;
}

export const CollectionGrid: FC<CollectionGridProps> = ({
  storyIds,
  getStoryHref,
  getStoryPreviewHref,
  showAll = false,
  onShowAll,
  storyInfo,
  summaryHidden = false,
}) => (
  <div className={styles.gridContainer}>
    <div
      className={styles.grid}
      role="list"
      data-show-all={showAll || undefined}
      data-testid="review-collection-grid"
    >
      {storyIds.map((storyId, storyIndex) => {
        const info = storyInfo[storyId] ?? fallbackStoryInfo(storyId);
        return (
          <StoryPreviewCell
            key={storyId}
            storyId={storyId}
            href={getStoryHref?.(storyId, storyIndex)}
            info={info}
            getPreviewHref={getStoryPreviewHref}
            summaryHidden={summaryHidden}
          />
        );
      })}
      <div className={clsx(styles.cell, styles.reviewAllCell)} role="presentation" data-review-all>
        <div className={styles.reviewAllShell}>
          <div className={styles.reviewAllFrame}>
            <Button size="medium" onClick={() => onShowAll?.()}>
              Review all {storyIds.length}
            </Button>
          </div>
        </div>
        <div className={styles.actionBar} aria-hidden="true" />
      </div>
    </div>
  </div>
);
