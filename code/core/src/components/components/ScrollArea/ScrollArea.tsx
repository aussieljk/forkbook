import type { CSSProperties } from 'react';
import React, { forwardRef } from 'react';

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { clsx } from 'clsx';

import styles from './ScrollArea.module.css';

export interface ScrollAreaProps {
  children?: React.ReactNode;
  horizontal?: boolean;
  vertical?: boolean;
  className?: string;
  offset?: number;
  scrollbarSize?: number;
  scrollPadding?: number | string;
  /**
   * Set this to define a tabIndex on the scrollable content; only needed when content has no
   * interactive elements.
   */
  focusable?: boolean;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      children,
      horizontal = false,
      vertical = false,
      offset = 2,
      scrollbarSize = 3,
      scrollPadding = 0,
      className,
      focusable = false,
    },
    ref
  ) => (
    <ScrollAreaPrimitive.Root
      className={clsx(styles.root, className)}
      style={
        {
          '--scrollbar-size': `${scrollbarSize + offset}px`,
          '--scrollbar-offset': `${offset}px`,
        } as CSSProperties
      }
      data-both={(horizontal && vertical) || undefined}
    >
      <ScrollAreaPrimitive.Viewport
        ref={ref}
        className={styles.viewport}
        data-focusable={focusable || undefined}
        style={{
          scrollPadding,
          overflowX: horizontal ? 'scroll' : 'hidden',
          overflowY: vertical ? 'scroll' : 'hidden',
        }}
        // Base UI puts every scrollable viewport in the tab order. We only do it when asked.
        tabIndex={focusable ? 0 : undefined}
      >
        <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      {horizontal && (
        <ScrollAreaPrimitive.Scrollbar className={styles.scrollbar} orientation="horizontal">
          <ScrollAreaPrimitive.Thumb className={styles.thumb} />
        </ScrollAreaPrimitive.Scrollbar>
      )}
      {vertical && (
        <ScrollAreaPrimitive.Scrollbar className={styles.scrollbar} orientation="vertical">
          <ScrollAreaPrimitive.Thumb className={styles.thumb} />
        </ScrollAreaPrimitive.Scrollbar>
      )}
      {horizontal && vertical && <ScrollAreaPrimitive.Corner />}
    </ScrollAreaPrimitive.Root>
  )
);
ScrollArea.displayName = 'ScrollArea';
