import React from 'react';

import { TooltipNote, WithTooltip } from '@aussieljk/forkbook/internal/components';

import type { Color } from '@aussieljk/forkbook/theming';

import styles from './StatusBadge.module.css';

export type PlayStatus = 'rendering' | 'playing' | 'completed' | 'errored' | 'aborted';

export interface StatusBadgeProps {
  status: PlayStatus;
}

const StatusColorMapping: Record<PlayStatus, keyof Color> = {
  rendering: 'mediumdark',
  playing: 'warning',
  completed: 'positive',
  errored: 'negative',
  aborted: 'purple',
} as const;

const StatusTextMapping: Record<PlayStatus, string> = {
  rendering: 'Wait',
  playing: 'Runs',
  completed: 'Pass',
  errored: 'Fail',
  aborted: 'Bail',
} as const;

const StatusNoteMapping: Record<PlayStatus, string> = {
  rendering: 'Story is rendering',
  playing: 'Interactions are running',
  completed: 'Story ran successfully',
  errored: 'Story failed to complete',
  aborted: 'Interactions aborted due to file changes',
} as const;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const badgeText = StatusTextMapping[status];
  const badgeNote = StatusNoteMapping[status];
  return (
    <WithTooltip
      hasChrome={false}
      placement="top"
      trigger="hover"
      tooltip={<TooltipNote note={badgeNote} />}
    >
      <div
        className={styles.badge}
        style={{ backgroundColor: `var(--sb-color-${StatusColorMapping[status]})` }}
        aria-label={`Story status: ${badgeText}`}
      >
        {badgeText}
      </div>
    </WithTooltip>
  );
};
