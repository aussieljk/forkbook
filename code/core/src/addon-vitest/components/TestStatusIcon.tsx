import type { ComponentProps, CSSProperties } from 'react';
import React from 'react';

import { clsx } from 'clsx';

import styles from './TestStatusIcon.module.css';

interface TestStatusIconProps extends ComponentProps<'div'> {
  isRunning: boolean;
  status: 'positive' | 'warning' | 'negative' | 'critical' | 'unknown';
  percentage?: number;
}

export const TestStatusIcon = ({
  isRunning,
  status,
  percentage,
  className,
  style,
  ...props
}: TestStatusIconProps) => (
  <div
    className={clsx(styles.icon, className)}
    data-status={status}
    data-running={isRunning || undefined}
    data-percentage={percentage || undefined}
    style={percentage ? ({ '--percentage': `${percentage}%`, ...style } as CSSProperties) : style}
    {...props}
  />
);
