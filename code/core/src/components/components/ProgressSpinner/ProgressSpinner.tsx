import React, { type ComponentProps, type CSSProperties } from 'react';

import { clsx } from 'clsx';

import styles from './ProgressSpinner.module.css';

const XMLNS = 'http://www.w3.org/2000/svg';

interface ProgressSpinnerProps extends ComponentProps<'div'> {
  percentage?: number;
  running?: boolean;
  size?: number;
  width?: number;
  children?: React.ReactNode;
}

const Circle = ({ variant, offset }: { variant?: 'spinner' | 'progress'; offset?: number }) => (
  <svg className={styles.circle} data-variant={variant} xmlns={XMLNS}>
    <circle strokeDashoffset={offset} />
  </svg>
);

export const ProgressSpinner = ({
  percentage = undefined,
  running = true,
  size = 24,
  width = 1.5,
  children = null,
  className,
  style,
  ...props
}: ProgressSpinnerProps) => {
  const diameter = size - Math.ceil(width);
  const offset =
    typeof percentage === 'number' ? Math.PI * diameter * (1 - percentage / 100) : undefined;

  return (
    <div
      className={clsx(styles.wrapper, className)}
      style={
        {
          '--spinner-size': `${size}px`,
          '--spinner-radius': `${diameter / 2}px`,
          '--spinner-center': `${size / 2}px`,
          '--spinner-width': `${width}px`,
          '--spinner-dasharray': `${Math.PI * diameter}`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
      {typeof percentage === 'number' && (
        <>
          <Circle />
          {running && <Circle variant="spinner" offset={offset} />}
          <Circle variant="progress" offset={offset} />
        </>
      )}
    </div>
  );
};
