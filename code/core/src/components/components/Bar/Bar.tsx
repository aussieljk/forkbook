import type { ComponentProps, CSSProperties } from 'react';
import React, { Children, forwardRef } from 'react';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';

import { clsx } from 'clsx';

import styles from './Bar.module.css';

export interface BarProps extends ComponentProps<'div'> {
  backgroundColor?: string;
  border?: boolean;
  className?: string;
  children?: React.ReactNode;
  scrollable?: boolean;
  /** Inline styles for the element that holds the children. */
  innerStyle?: CSSProperties;
}

export const Bar = forwardRef<HTMLDivElement, BarProps>(
  (
    {
      scrollable = true,
      border = false,
      backgroundColor,
      children,
      innerStyle,
      className,
      style,
      ...rest
    },
    ref
  ) => {
    return (
      <div
        {...rest}
        ref={ref}
        className={clsx(styles.bar, className)}
        data-scrollable={scrollable || undefined}
        data-border={border || undefined}
        style={{
          ...(backgroundColor && { '--bar-bg': backgroundColor }),
          ...(scrollable ? undefined : innerStyle),
          ...style,
        }}
      >
        {scrollable ? (
          <div className={styles.heightPreserver} style={innerStyle}>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    );
  }
);

Bar.displayName = 'Bar';

export interface SideProps extends ComponentProps<'div'> {
  left?: boolean;
  right?: boolean;
  scrollable?: boolean;
}

export const Side = ({ left, right, scrollable, className, ...props }: SideProps) => (
  <div
    className={clsx(styles.side, className)}
    data-left={left || undefined}
    data-right={right || undefined}
    data-scrollable={scrollable || undefined}
    {...props}
  />
);
Side.displayName = 'Side';

export interface FlexBarProps extends BarProps {
  border?: boolean;
  backgroundColor?: string;
}

export const FlexBar = ({ children, backgroundColor, className = '', ...rest }: FlexBarProps) => {
  deprecate('FlexBar is deprecated. Use Bar with justifyContent: "space-between" instead.');
  const [left, right] = Children.toArray(children);
  return (
    <Bar
      data-deprecated="FlexBar"
      backgroundColor={backgroundColor}
      className={clsx('fb-bar', styles.barWithoutPadding, className)}
      {...rest}
    >
      <div className={styles.barInner} style={{ backgroundColor: backgroundColor || undefined }}>
        <Side scrollable={rest.scrollable} left>
          {left}
        </Side>
        {right ? <Side right>{right}</Side> : null}
      </div>
    </Bar>
  );
};
FlexBar.displayName = 'FlexBar';
