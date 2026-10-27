import React, { type HTMLAttributes, forwardRef } from 'react';

import { XIcon } from 'lucide-react';

import { clsx } from 'clsx';

import { Button } from '../Button/Button.tsx';
import styles from './Popover.module.css';

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  /** Content of the popover. */
  children: React.ReactNode;

  /** Preset popover color taken from the theme, affecting both bathground and foreground. */
  color?: 'default' | 'inverse' | 'positive' | 'negative' | 'warning' | 'none';

  /** Whether the popover is rendered with a decorative window-like appearance. */
  hasChrome: boolean;

  /** Optional callback connected to a close button. Then button is shown only when passed. */
  onHide?: () => void;

  /** Optional custom label for the close button, if there is one. */
  hideLabel?: string;

  /** Padding between the content and popover edge. */
  padding?: number | string;
}

export const Popover = forwardRef<HTMLDivElement, PopoverProps>(
  (
    {
      children,
      color = 'default',
      hasChrome = true,
      hideLabel = 'Close',
      onHide,
      padding = 8,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        {...props}
        className={clsx(styles.popover, className)}
        style={{ padding, ...style }}
        data-color={color}
        data-chrome={hasChrome || undefined}
        data-close-button={onHide ? true : undefined}
      >
        {children}
        {onHide && (
          <Button
            className={styles.closeButton}
            ariaLabel={hideLabel}
            onClick={onHide}
            padding="small"
            variant="ghost"
            size="small"
          >
            <XIcon />
          </Button>
        )}
      </div>
    );
  }
);

Popover.displayName = 'Popover';
