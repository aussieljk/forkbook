import type { FC } from 'react';
import React from 'react';

import { Button } from 'storybook/internal/components';

import { AlertIcon } from '@storybook/icons';
import { clsx } from 'clsx';

import styles from './SnippetWarning.module.css';

export const SNIPPET_WARNING_LABEL = 'Incomplete code snippet';

export interface SnippetWarningProps {
  /** Why the snippet is an incomplete example; see `StoryDoc.warning`. */
  warning?: string;
  className?: string;
}

export const SnippetWarning: FC<SnippetWarningProps> = ({ warning, className }) => {
  if (!warning?.trim()) {
    return null;
  }

  return (
    <Button
      className={clsx(styles.warningButton, className)}
      // The label names the condition for screen readers; the tooltip carries the whole reason.
      ariaLabel={SNIPPET_WARNING_LABEL}
      tooltip={warning}
      variant="ghost"
      size="small"
      padding="small"
    >
      <AlertIcon />
    </Button>
  );
};
