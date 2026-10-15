import React from 'react';

import { Button, P, Separator, Toolbar as SharedToolbar } from 'storybook/internal/components';

import {
  FastForwardIcon,
  PlayBackIcon,
  PlayNextIcon,
  RewindIcon,
  SyncIcon,
} from '@storybook/icons';

import { type API } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';

import { type ControlStates } from '../../instrumenter/types.ts';
import type { Controls } from './InteractionsPanel.tsx';
import { type PlayStatus, StatusBadge } from './StatusBadge.tsx';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  controls: Controls;
  controlStates: ControlStates;
  status: PlayStatus;
  storyFileName?: string;
  onScrollToEnd?: () => void;
  importPath?: string;
  canOpenInEditor?: boolean;
  api: API;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  controls,
  controlStates,
  status,
  storyFileName,
  onScrollToEnd,
  importPath,
  canOpenInEditor,
  api,
}) => {
  const buttonText = status === 'errored' ? 'Scroll to error' : 'Scroll to end';
  const theme = useTheme();

  const preventFocusLoss = (e: React.PointerEvent) => e.preventDefault();

  return (
    <div className={styles.wrapper}>
      <SharedToolbar
        backgroundColor={theme.background.app}
        innerStyle={{ gap: 6, paddingInline: 15 }}
        aria-label="Component test playback controls"
      >
        <div className={styles.controlsGroup}>
          <StatusBadge status={status} />

          <Button
            className={styles.jumpToEndButton}
            ariaLabel={false}
            onClick={onScrollToEnd}
            onPointerDown={preventFocusLoss}
            disabled={!onScrollToEnd}
          >
            {buttonText}
          </Button>

          <Separator />

          <Button
            className={styles.rewindButton}
            padding="small"
            variant="ghost"
            ariaLabel="Go to start"
            onClick={controls.start}
            onPointerDown={preventFocusLoss}
            disabled={!controlStates.start}
          >
            <RewindIcon />
          </Button>

          <Button
            className={styles.iconButton}
            padding="small"
            variant="ghost"
            ariaLabel="Go back"
            onClick={controls.back}
            onPointerDown={preventFocusLoss}
            disabled={!controlStates.back}
          >
            <PlayBackIcon />
          </Button>

          <Button
            className={styles.iconButton}
            padding="small"
            variant="ghost"
            ariaLabel="Go forward"
            onClick={controls.next}
            onPointerDown={preventFocusLoss}
            disabled={!controlStates.next}
          >
            <PlayNextIcon />
          </Button>

          <Button
            className={styles.iconButton}
            padding="small"
            variant="ghost"
            ariaLabel="Go to end"
            onClick={controls.end}
            onPointerDown={preventFocusLoss}
            disabled={!controlStates.end}
          >
            <FastForwardIcon />
          </Button>

          <Button
            className={styles.iconButton}
            padding="small"
            variant="ghost"
            ariaLabel="Rerun"
            onClick={controls.rerun}
            onPointerDown={preventFocusLoss}
          >
            <SyncIcon />
          </Button>
        </div>
        {(importPath || storyFileName) &&
          (canOpenInEditor ? (
            <Button
              className={styles.openInEditorButton}
              padding="small"
              size="small"
              variant="ghost"
              ariaLabel="Open in editor"
              onClick={() => {
                api.openInEditor({
                  file: importPath as string,
                });
              }}
            >
              {storyFileName}
            </Button>
          ) : (
            <P className={styles.location}>{storyFileName}</P>
          ))}
      </SharedToolbar>
    </div>
  );
};
