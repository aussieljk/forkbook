import React, { type FC, type ReactNode, useId, useRef } from 'react';

import { useLandmark } from '../../../hooks/useLandmark.ts';
import styles from './ReviewHeader.module.css';

export interface ReviewHeaderProps {
  /** Optional control rendered before the title (e.g. a back button). */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing cluster on the right of the top row. */
  actions?: ReactNode;
  /** Optional full-width second row (e.g. search or comparison controls). */
  secondRow?: ReactNode;
  /** Compact layout for the preview toolbar header row. */
  variant?: 'page' | 'toolbar';
}

export const ReviewHeader: FC<ReviewHeaderProps> = ({
  leading,
  title,
  subtitle,
  actions,
  secondRow,
  variant = 'page',
}) => {
  const titleId = useId();
  const regionRef = useRef<HTMLElement>(null);

  const { landmarkProps } = useLandmark({ 'aria-labelledby': titleId, role: 'banner' }, regionRef);

  return (
    <header className={styles.root} data-variant={variant} ref={regionRef} {...landmarkProps}>
      <div className={styles.topRow} data-variant={variant}>
        <div className={styles.main}>
          {leading ? <div className={styles.leading}>{leading}</div> : null}
          <div className={styles.textBlock}>
            <h1 className={styles.title} id={titleId}>
              {title}
            </h1>
            {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
          </div>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {secondRow ? <div className={styles.secondRow}>{secondRow}</div> : null}
    </header>
  );
};
