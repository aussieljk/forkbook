import React from 'react';

import type { API_Layout } from '../../../types/index.ts';
import { Drag } from './Drag.tsx';
import styles from './PanelContainer.module.css';

interface PanelContainerProps {
  children: React.ReactNode;
  bottomPanelHeight: number;
  rightPanelWidth: number;
  panelMaxSize: number | undefined;
  panelResizerRef: React.Ref<HTMLDivElement>;
  position: API_Layout['panelPosition'];
}

/**
 * Shows the addon panel and its resize drag handle. The drag handle is always rendered so users can
 * reopen the panel. The panel is always rendered (to preserve internal state), but it's excluded
 * from the Accessibility Object Model when effectively collapsed.
 */
const PanelContainer = React.memo<PanelContainerProps>(function PanelContainer(props) {
  const { children, bottomPanelHeight, rightPanelWidth, panelMaxSize, panelResizerRef, position } =
    props;

  const shouldHidePanelContent =
    position === 'bottom' ? bottomPanelHeight === 0 : rightPanelWidth === 0;

  return (
    <div className={styles.container} data-position={position}>
      <Drag
        ref={panelResizerRef}
        position={position}
        overlapping={position === 'bottom' ? !!bottomPanelHeight : !!rightPanelWidth}
        aria-label="Addon panel resize handle"
        aria-valuenow={position === 'bottom' ? bottomPanelHeight : rightPanelWidth}
        aria-valuemax={panelMaxSize}
      />
      <div
        className={styles.slot}
        // This ensures that the panel content is not reachable by keyboard or assistive
        // tech when actually collapsed.
        hidden={shouldHidePanelContent ? true : undefined}
        aria-hidden={shouldHidePanelContent ? true : undefined}
      >
        {children}
      </div>
    </div>
  );
});

export { PanelContainer };
