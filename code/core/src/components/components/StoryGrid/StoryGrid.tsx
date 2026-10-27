import type { FC, MouseEvent } from 'react';
import React, { useEffect, useRef, useState } from 'react';

import type { StoryGridComponent } from '../../../shared/story-grid.ts';
import styles from './StoryGrid.module.css';

export type { StoryGridComponent };

/** True when the element is in (or near) the view. Stays true after the first time. */
export const useNearView = (rootMargin = '200px') => {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || near) {
      return undefined;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near, rootMargin]);
  return { ref, near };
};

export interface StoryGridProps {
  components: StoryGridComponent[];
  /** The `href` of the card link. */
  getHref: (component: StoryGridComponent) => string;
  /** Opens the component. A plain click calls it, so the page does not reload. */
  onSelect?: (component: StoryGridComponent) => void;
  /** The `src` of the live preview of a story, for a card that has no thumbnail. */
  getPreviewSrc: (storyId: string) => string;
}

const CardPreview: FC<{ component: StoryGridComponent; getPreviewSrc: (id: string) => string }> = ({
  component,
  getPreviewSrc,
}) => {
  const { ref, near } = useNearView();
  if (component.thumbnail) {
    return (
      <div className={styles.media}>
        <img className={styles.image} src={component.thumbnail} alt="" loading="lazy" />
      </div>
    );
  }
  return (
    <div className={styles.media} ref={ref}>
      {near && component.firstStoryId ? (
        <iframe
          className={styles.frame}
          src={getPreviewSrc(component.firstStoryId)}
          title={`${component.name} preview`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
        />
      ) : null}
    </div>
  );
};

/** A grid of cards, one for each component. */
export const StoryGrid: FC<StoryGridProps> = ({ components, getHref, onSelect, getPreviewSrc }) => {
  const onClick = (event: MouseEvent, component: StoryGridComponent) => {
    if (!onSelect || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    onSelect(component);
  };

  if (components.length === 0) {
    return <p className={styles.empty}>No components yet.</p>;
  }

  return (
    <ul className={styles.grid} aria-label="Components">
      {components.map((component) => (
        <li key={component.title} className={styles.item}>
          <a
            className={styles.card}
            href={getHref(component)}
            onClick={(event) => onClick(event, component)}
          >
            <CardPreview component={component} getPreviewSrc={getPreviewSrc} />
            <span className={styles.text}>
              <span className={styles.title}>{component.name}</span>
              {component.title !== component.name ? (
                <span className={styles.path}>{component.title}</span>
              ) : null}
              <span className={styles.count}>
                {component.storyIds.length === 1
                  ? '1 story'
                  : `${component.storyIds.length} stories`}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
};
