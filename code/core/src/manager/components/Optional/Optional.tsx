import type { ReactElement } from 'react';
import React, { useEffect, useRef, useState } from 'react';

import styles from './Optional.module.css';

const hiddenState = (hidden: boolean | null) => (hidden === null ? 'unknown' : String(hidden));

export const Optional = ({
  content,
  fallback,
}: {
  content: ReactElement;
  fallback?: ReactElement;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<boolean | null>(null);

  const contentWidth = useRef(contentRef.current?.offsetWidth ?? 0);
  const wrapperWidth = useRef(wrapperRef.current?.offsetWidth ?? 0);

  useEffect(() => {
    if (contentRef.current && wrapperRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        wrapperWidth.current = wrapperRef.current?.offsetWidth || wrapperWidth.current;
        contentWidth.current = contentRef.current?.offsetWidth || contentWidth.current;
        setHidden(contentWidth.current > wrapperWidth.current);
      });
      resizeObserver.observe(wrapperRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.content} data-hidden={hiddenState(hidden)} ref={contentRef}>
        {content}
      </div>

      {fallback && (
        <div className={styles.content} data-hidden={hiddenState(!hidden)}>
          {fallback}
        </div>
      )}
    </div>
  );
};
