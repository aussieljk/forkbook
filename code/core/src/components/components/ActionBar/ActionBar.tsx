import type { ComponentProps, MouseEvent, ReactElement } from 'react';
import React from 'react';

import { clsx } from 'clsx';

import styles from './ActionBar.module.css';

export const ActionButton = ({ className, ...props }: ComponentProps<'button'>) => (
  <button className={clsx(styles.actionButton, className)} {...props} />
);
ActionButton.displayName = 'ActionButton';

export interface ActionItem {
  title: string | ReactElement;
  ariaLabel?: string;
  className?: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}

export interface ActionBarProps {
  /** Items to render in this ActionBar. */
  actionItems: ActionItem[];
  /**
   * When true, ActionBar aligns to the flex end and inline end of a wrapping row flex container.
   * When false, ActionBar is positioned absolutely at the bottom right of its relative parent.
   */
  flexLayout?: boolean;
}

export const ActionBar = ({ actionItems, flexLayout = false, ...props }: ActionBarProps) => {
  return (
    <div {...props} className={styles.container} data-flex-layout={flexLayout || undefined}>
      {actionItems.map(({ title, ariaLabel, className, onClick, disabled }, index: number) => (
        <ActionButton
          key={index}
          aria-label={ariaLabel}
          className={className}
          onClick={onClick}
          disabled={!!disabled}
        >
          {title}
        </ActionButton>
      ))}
    </div>
  );
};
