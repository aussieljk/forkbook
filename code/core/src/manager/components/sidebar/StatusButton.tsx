import type { ComponentProps, CSSProperties } from 'react';
import React, { forwardRef } from 'react';

import { Button } from 'storybook/internal/components';
import type { StatusValue } from 'storybook/internal/types';

import { clsx } from 'clsx';
import { useTheme } from 'storybook/theming';

import { getStatus } from '../../utils/status.tsx';
import styles from './StatusButton.module.css';

/** Props that give an element the icon colour of a status. */
const useStatusColor = (status: StatusValue, style?: CSSProperties) => {
  const iconColor = getStatus(useTheme(), status).iconColor;
  return {
    'data-status-color': iconColor ? true : undefined,
    style: iconColor ? ({ '--sb-status-color': iconColor, ...style } as CSSProperties) : style,
  };
};

export const StatusLabel = ({
  status,
  className,
  style,
  ...props
}: ComponentProps<'div'> & { status: StatusValue }) => (
  <div
    className={clsx(styles.statusLabel, className)}
    {...useStatusColor(status, style)}
    {...props}
  />
);

export interface StatusButtonProps extends ComponentProps<typeof Button> {
  status: StatusValue;
  selectedItem?: boolean;
}

export const StatusButton = forwardRef<HTMLButtonElement, StatusButtonProps>(
  ({ status, selectedItem, className, style, ...props }, ref) => (
    <Button
      variant="ghost"
      padding="small"
      className={clsx(styles.statusButton, className)}
      data-selected-item={selectedItem || undefined}
      {...useStatusColor(status, style)}
      {...props}
      ref={ref}
    />
  )
);
StatusButton.displayName = 'StatusButton';
