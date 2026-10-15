import type { FC, SyntheticEvent } from 'react';
import React from 'react';

import { Button, Toolbar as SharedToolbar } from '@aussieljk/forkbook/internal/components';

import { ShareAltIcon, SyncIcon, ZoomIcon, ZoomOutIcon, ZoomResetIcon } from '@storybook/icons';
import { clsx } from 'clsx';

import { getStoryHref } from '../getStoryHref';
import styles from './Toolbar.module.css';

interface ZoomProps {
  zoom: (val: number) => void;
  resetZoom: () => void;
}

interface EjectProps {
  storyId?: string;
}

interface ReloadProps {
  onReloadStory?: () => void;
}

interface BarProps {
  border?: boolean;
}

interface LoadingProps {
  isLoading?: boolean;
}

export type ToolbarProps = BarProps &
  ZoomProps &
  EjectProps &
  LoadingProps &
  ReloadProps & { className?: string };

export const TRAILING_INSET = 10;

export const Toolbar: FC<ToolbarProps> = ({
  isLoading,
  storyId,
  zoom,
  resetZoom,
  onReloadStory,
  className,
  ...rest
}) => (
  <SharedToolbar
    className={clsx(styles.absoluteBar, className)}
    // The toolbar is absolutely positioned inside the preview container's 1px border, so it lands
    // on the shared edge one pixel short of the inset the other two icons use.
    innerStyle={{
      gap: 4,
      paddingInline: 7,
      paddingInlineEnd: TRAILING_INSET - 1,
      justifyContent: 'space-between',
    }}
    lang="en"
    {...rest}
  >
    <div key="left" className={styles.wrapper}>
      {isLoading ? (
        [1, 2, 3].map((key) => <div key={key} className={styles.iconPlaceholder} />)
      ) : (
        <>
          {onReloadStory && (
            <Button
              padding="small"
              variant="ghost"
              key="reload"
              onClick={onReloadStory}
              ariaLabel="Reload story"
            >
              <SyncIcon />
            </Button>
          )}
          <Button
            padding="small"
            variant="ghost"
            key="zoomin"
            onClick={(e: SyntheticEvent) => {
              e.preventDefault();
              zoom(0.8);
            }}
            ariaLabel="Zoom in"
          >
            <ZoomIcon />
          </Button>
          <Button
            padding="small"
            variant="ghost"
            key="zoomout"
            onClick={(e: SyntheticEvent) => {
              e.preventDefault();
              zoom(1.25);
            }}
            ariaLabel="Zoom out"
          >
            <ZoomOutIcon />
          </Button>
          <Button
            padding="small"
            variant="ghost"
            key="zoomreset"
            onClick={(e: SyntheticEvent) => {
              e.preventDefault();
              resetZoom();
            }}
            ariaLabel="Reset zoom"
          >
            <ZoomResetIcon />
          </Button>
        </>
      )}
    </div>

    {isLoading ? (
      <div key="right" className={styles.wrapper}>
        <div className={styles.iconPlaceholder} />
      </div>
    ) : (
      storyId && (
        <div key="right" className={styles.wrapper}>
          <Button
            asChild
            padding="small"
            variant="ghost"
            key="opener"
            ariaLabel="Open canvas in new tab"
          >
            <a href={getStoryHref(storyId)} target="_blank" rel="noopener noreferrer">
              <ShareAltIcon />
            </a>
          </Button>
        </div>
      )
    )}
  </SharedToolbar>
);
