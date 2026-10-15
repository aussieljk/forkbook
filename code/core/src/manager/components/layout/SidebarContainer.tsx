import React from 'react';

import { Drag } from './Drag.tsx';
import styles from './SidebarContainer.module.css';

interface SidebarContainerProps {
  children: React.ReactNode;
  navSize: number;
  sidebarMaxWidth: number | undefined;
  sidebarResizerRef: React.Ref<HTMLDivElement>;
}

/**
 * Shows the sidebar and its resize drag handle. The drag handle is always rendered so users can
 * reopen the sidebar. The sidebar is always rendered (to preserve internal state), but it's
 * excluded from the Accessibility Object Model when effectively collapsed.
 */
const SidebarContainer = React.memo<SidebarContainerProps>(function SidebarContainer(props) {
  const { children, navSize, sidebarMaxWidth, sidebarResizerRef } = props;

  const shouldHideSidebarContent = navSize === 0;

  return (
    <div className={styles.container}>
      <div
        className={styles.slot}
        // This ensures that the sidebar content is not reachable by keyboard or assistive
        // tech when actually collapsed.
        hidden={shouldHideSidebarContent ? true : undefined}
        aria-hidden={shouldHideSidebarContent ? true : undefined}
      >
        {children}
      </div>
      <Drag
        ref={sidebarResizerRef}
        position="left"
        aria-label="Sidebar resize handle"
        aria-valuenow={navSize}
        aria-valuemax={sidebarMaxWidth}
      />
    </div>
  );
});

export { SidebarContainer };
