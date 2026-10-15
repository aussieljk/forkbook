import React, { useRef } from 'react';

import { Match } from 'storybook/internal/router';

import { useLandmark } from '../../hooks/useLandmark.ts';
import styles from './MainAreaContainer.module.css';

interface PagesContainerProps {
  children: React.ReactNode;
}

/**
 * Shows Router-controlled pages (e.g. settings/about), inside a landmark for navigability. Assumes
 * that the main preview area is not concurrently reachable by assistive technologies, since these
 * components both define a `main` role.
 */
const PagesContainer = React.memo<PagesContainerProps>(function PagesContainer(props) {
  const { children } = props;

  const mainRef = useRef<HTMLElement>(null);
  const { landmarkProps } = useLandmark(
    { 'aria-labelledby': 'main-content-heading', role: 'main' },
    mainRef
  );

  return (
    <main className={styles.pages} id="main-content-wrapper" ref={mainRef} {...landmarkProps}>
      <h2 id="main-content-heading" className="sb-sr-only">
        Main content
      </h2>
      {children}
    </main>
  );
});

interface MainAreaContainerProps {
  showPages: boolean;
  slotMain: React.ReactNode;
  slotPages: React.ReactNode;
}

/**
 * Shows Router-controlled pages (e.g. settings/about), inside a landmark for navigability, OR shows
 * the preview area. Ensures a single `main` landmark exists at a time.
 */
const MainAreaContainer = React.memo<MainAreaContainerProps>(function MainAreaContainer({
  showPages,
  slotMain,
  slotPages,
}) {
  return (
    <>
      {showPages ? (
        <PagesContainer>{slotPages}</PagesContainer>
      ) : (
        <Match path={/(^\/story|docs|^\/$)/} startsWith={false}>
          {({ match }) => (
            <div className={styles.main} data-shown={!!match || undefined}>
              {slotMain}
            </div>
          )}
        </Match>
      )}
    </>
  );
});

export { MainAreaContainer };
