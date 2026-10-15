import React, { forwardRef } from 'react';

import { clsx } from 'clsx';

import { Button, type ButtonProps } from '../Button/Button.tsx';
import styles from './ToggleButton.module.css';

export interface ToggleButtonProps extends ButtonProps {
  /** Whether the ToggleButton is currently pressed or not. */
  pressed: boolean;
}

// In case of reports on screenreader announcements, please check
// https://adrianroselli.com/2021/10/switch-role-support.html.

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ pressed, className, ...props }, ref) => {
    return (
      <Button
        role="switch"
        aria-checked={pressed}
        ref={ref}
        className={clsx(styles.toggle, className)}
        {...props}
      />
    );
  }
);

ToggleButton.displayName = 'ToggleButton';
