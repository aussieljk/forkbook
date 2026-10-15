import React from 'react';

import { Link } from 'storybook/internal/components';

import { PANEL_ID } from '../constants.ts';
import styles from './DetachedDebuggerMessage.module.css';

export const DetachedDebuggerMessage = ({ storyUrl }: { storyUrl: string }) => {
  return (
    <div className={styles.message}>
      Debugger controls are not available on composed Storybooks.{' '}
      <Link
        href={`${storyUrl}&addonPanel=${PANEL_ID}`}
        target="_blank"
        rel="noopener noreferrer"
        withArrow
      >
        Open in external Storybook
      </Link>
    </div>
  );
};
