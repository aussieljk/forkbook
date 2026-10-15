import type { FC, ReactNode } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ChevronSmallLeftIcon, ChevronSmallRightIcon } from '@storybook/icons';

import { Tabs } from '@base-ui/react/tabs';
import { Button } from '../Button/Button.tsx';
import styles from './StatelessTabList.module.css';

const SCROLL_BUTTON_WIDTH = 28; // 16 width + 6 + 6 padding

export interface StatelessTabListProps {
  children?: ReactNode;
}

export const StatelessTabList: FC<StatelessTabListProps> = ({ children, ...rest }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    const container = containerRef.current;

    if (!scrollContainer || !container) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    const availableWidth =
      container.clientWidth - (showScrollButtons ? SCROLL_BUTTON_WIDTH * 2 : 0);

    const needsScrolling = scrollWidth > availableWidth;
    setShowScrollButtons(needsScrolling);

    if (needsScrolling) {
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    } else {
      setCanScrollLeft(false);
      setCanScrollRight(false);
    }
  }, [showScrollButtons]);

  const throttledUpdateScrollState = useCallback(() => {
    updateScrollState();
  }, [updateScrollState]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || typeof window === 'undefined') {
      return;
    }

    scrollContainer.addEventListener('scroll', throttledUpdateScrollState, { passive: true });

    // SSR safety: ResizeObserver may not exist in all environments
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(throttledUpdateScrollState);
      resizeObserver.observe(scrollContainer);
    }

    // Initial update - delay to ensure DOM is ready
    const timeoutId = setTimeout(throttledUpdateScrollState, 0);

    return () => {
      clearTimeout(timeoutId);
      scrollContainer.removeEventListener('scroll', throttledUpdateScrollState);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [throttledUpdateScrollState]);

  const scroll = useCallback((direction: 'backward' | 'forward') => {
    const scrollContainer = scrollContainerRef.current;
    const container = containerRef.current;

    if (!scrollContainer || !container || typeof window === 'undefined') {
      return;
    }

    const availableWidth = container.clientWidth - SCROLL_BUTTON_WIDTH * 2;
    const scrollDistance = direction === 'backward' ? -availableWidth : availableWidth;

    // SSR safety: scrollBy may not exist in all environments
    if (typeof scrollContainer.scrollBy === 'function') {
      scrollContainer.scrollBy({ left: scrollDistance, behavior: 'smooth' });
    } else {
      // Fallback for older browsers or SSR
      scrollContainer.scrollLeft += scrollDistance;
    }
  }, []);

  const scrollBackward = useCallback(() => scroll('backward'), [scroll]);
  const scrollForward = useCallback(() => scroll('forward'), [scroll]);

  return (
    <div
      ref={containerRef}
      className={`${styles.root} tablist ${showScrollButtons ? 'tablist-has-scroll' : ''}`}
    >
      {showScrollButtons && (
        <div
          className={styles.scrollButtonContainer}
          data-border={canScrollLeft ? 'end' : undefined}
        >
          <Button
            className={styles.scrollButton}
            variant="ghost"
            padding="small"
            size="small"
            ariaLabel="Scroll backward"
            disabled={!canScrollLeft}
            onClick={scrollBackward}
            tabIndex={-1}
          >
            <ChevronSmallLeftIcon />
          </Button>
        </div>
      )}
      <div className={styles.scrollContainer} ref={scrollContainerRef}>
        <Tabs.List className={styles.tabList} activateOnFocus {...rest}>
          {children}
        </Tabs.List>
      </div>
      {showScrollButtons && (
        <div
          className={styles.scrollButtonContainer}
          data-border={canScrollRight ? 'start' : undefined}
        >
          <Button
            className={styles.scrollButton}
            variant="ghost"
            padding="small"
            size="small"
            ariaLabel="Scroll forward"
            disabled={!canScrollRight}
            onClick={scrollForward}
            tabIndex={-1}
          >
            <ChevronSmallRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
};
