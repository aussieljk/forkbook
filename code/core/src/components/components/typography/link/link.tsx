import type { AnchorHTMLAttributes, ElementType, MouseEvent } from 'react';
import React, { forwardRef } from 'react';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';

import { ChevronRightIcon } from '@storybook/icons';

import { clsx } from 'clsx';

import styles from './link.module.css';

// Cmd/Ctrl/Shift/Alt + Click should trigger default browser behavior. Same applies to non-left clicks
const LEFT_BUTTON = 0;

const isPlainLeftClick = (e: MouseEvent) =>
  e.button === LEFT_BUTTON && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;

const cancelled = (e: MouseEvent, cb: (_e: MouseEvent) => void) => {
  if (isPlainLeftClick(e)) {
    e.preventDefault();
    cb(e);
  }
};

export interface LinkStylesProps {
  secondary?: boolean;
  tertiary?: boolean;
  nochrome?: boolean;
  inverse?: boolean;
  isButton?: boolean;
}

export interface LinkInnerProps {
  withArrow?: boolean;
  containsIcon?: boolean;
}

type AProps = AnchorHTMLAttributes<HTMLAnchorElement>;

export interface LinkProps extends LinkInnerProps, LinkStylesProps, AProps {
  cancel?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: MouseEvent) => void;
  href?: string;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      cancel = true,
      children,
      onClick = undefined,
      withArrow = false,
      containsIcon = false,
      className = undefined,
      isButton = undefined,
      secondary,
      tertiary,
      nochrome,
      inverse,
      href,
      ...rest
    },
    ref
  ) => {
    if (isButton !== undefined) {
      deprecate(
        'Link: `isButton` is deprecated and will be removed in Forkbook 11. Links without a `href` are automatically rendered as buttons.'
      );
    }

    const Comp = (href ? 'a' : 'button') as ElementType;

    return (
      <Comp
        href={href}
        {...rest}
        ref={ref}
        data-secondary={secondary || undefined}
        data-tertiary={tertiary || undefined}
        data-nochrome={nochrome || undefined}
        data-inverse={inverse || undefined}
        data-button={!href || isButton === true || undefined}
        onClick={onClick && cancel ? (e: MouseEvent) => cancelled(e, onClick) : onClick}
        className={clsx(styles.link, className)}
      >
        <span
          className={styles.inner}
          data-with-arrow={withArrow || undefined}
          data-contains-icon={containsIcon || undefined}
        >
          {children}
          {withArrow && <ChevronRightIcon />}
        </span>
      </Comp>
    );
  }
);
Link.displayName = 'Link';
