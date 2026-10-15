import type { CSSProperties } from 'react';
import React, { useEffect, useLayoutEffect, useState } from 'react';

import type { API_Layout, API_ViewMode } from 'storybook/internal/types';

import { useStorybookApi, useStorybookState, type API } from 'storybook/manager-api';
import { isPagesViewMode } from '../../../manager-api/modules/layout.ts';

import { MINIMUM_CONTENT_WIDTH_PX } from '../../constants.ts';
import { Notifications } from '../../container/Notifications.tsx';
import { MobileNavigation } from '../mobile/navigation/MobileNavigation.tsx';
import { useLayout } from './LayoutProvider.tsx';
import { MainAreaContainer } from './MainAreaContainer.tsx';
import { PanelContainer } from './PanelContainer.tsx';
import { SidebarContainer } from './SidebarContainer.tsx';
import { useDragging } from './useDragging.ts';
import { useLandmarkIndicator } from './useLandmarkIndicator.ts';
import styles from './Layout.module.css';

interface InternalLayoutState {
  isDragging: boolean;
  dragCursor: string;
}

interface ManagerLayoutState extends Pick<
  API_Layout,
  'navSize' | 'bottomPanelHeight' | 'rightPanelWidth' | 'panelPosition'
> {
  viewMode: API_ViewMode;
}

export type LayoutState = InternalLayoutState & ManagerLayoutState;

interface Props {
  managerLayoutState: ManagerLayoutState;
  setManagerLayoutState: (state: Partial<Omit<ManagerLayoutState, 'viewMode'>>) => void;
  slotMain?: React.ReactNode;
  slotSidebar?: React.ReactNode;
  slotPanel?: React.ReactNode;
  slotPages?: React.ReactNode;
  /**
   * Persistent overlay rendered on top of the main content cell. Always mounted, so overlays can
   * keep state (e.g. loaded iframes) alive across route changes.
   */
  slotOverlay?: React.ReactNode;
}

const layoutStateIsEqual = (state: ManagerLayoutState, other: ManagerLayoutState) =>
  state.navSize === other.navSize &&
  state.bottomPanelHeight === other.bottomPanelHeight &&
  state.rightPanelWidth === other.rightPanelWidth &&
  state.panelPosition === other.panelPosition;

/**
 * Manages the internal state of panels while dragging, and syncs it with the layout state in the
 * global manager store when the user is done dragging. Also syncs the layout state from the global
 * manager store to the internal state here when necessary
 */
const useLayoutSyncingState = ({
  api,
  managerLayoutState,
  setManagerLayoutState,
  isDesktop,
}: {
  api: API;
  managerLayoutState: Props['managerLayoutState'];
  setManagerLayoutState: Props['setManagerLayoutState'];
  isDesktop: boolean;
}) => {
  // ref to keep track of previous managerLayoutState, to check if the props change
  const prevManagerLayoutStateRef = React.useRef<ManagerLayoutState>(managerLayoutState);

  const [internalDraggingSizeState, setInternalDraggingSizeState] = useState<LayoutState>({
    ...managerLayoutState,
    isDragging: false,
    dragCursor: 'col-resize',
  });

  /** Sync FROM managerLayoutState to internalDraggingState if user is not dragging */
  useEffect(() => {
    if (
      internalDraggingSizeState.isDragging || // don't interrupt user's drag
      layoutStateIsEqual(managerLayoutState, prevManagerLayoutStateRef.current) // don't set any state if managerLayoutState hasn't changed
    ) {
      return;
    }
    prevManagerLayoutStateRef.current = managerLayoutState;
    setInternalDraggingSizeState((state) => ({ ...state, ...managerLayoutState }));
  }, [internalDraggingSizeState.isDragging, managerLayoutState, setInternalDraggingSizeState]);

  /** Sync size changes TO managerLayoutState when drag is done */
  useLayoutEffect(() => {
    if (
      internalDraggingSizeState.isDragging || // wait with syncing managerLayoutState until user is done dragging
      layoutStateIsEqual(managerLayoutState, internalDraggingSizeState) // don't sync managerLayoutState if it doesn't differ from internalDraggingSizeStatee)
    ) {
      return;
    }
    const nextState = {
      navSize: internalDraggingSizeState.navSize,
      bottomPanelHeight: internalDraggingSizeState.bottomPanelHeight,
      rightPanelWidth: internalDraggingSizeState.rightPanelWidth,
    };
    prevManagerLayoutStateRef.current = {
      ...prevManagerLayoutStateRef.current,
      ...nextState,
    };
    setManagerLayoutState(nextState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalDraggingSizeState, setManagerLayoutState]);

  const isPagesShown = isPagesViewMode(managerLayoutState.viewMode);
  const isPanelShown = managerLayoutState.viewMode === 'story';

  const { navSize, rightPanelWidth, bottomPanelHeight } = internalDraggingSizeState.isDragging
    ? internalDraggingSizeState
    : managerLayoutState;

  const customisedNavSize = api.getNavSizeWithCustomisations?.(navSize) ?? navSize;
  const customisedShowPanel = api.getShowPanelWithCustomisations?.(isPanelShown) ?? isPanelShown;

  const { panelResizerRef, sidebarResizerRef, sidebarMaxWidth, panelMaxSize } = useDragging({
    setState: setInternalDraggingSizeState,
    isDesktop,
    navSize: customisedNavSize,
    showPanel: customisedShowPanel,
    rightPanelWidth,
    panelPosition: managerLayoutState.panelPosition,
  });

  return {
    navSize: customisedNavSize,
    rightPanelWidth,
    bottomPanelHeight,
    panelPosition: managerLayoutState.panelPosition,
    panelResizerRef,
    sidebarResizerRef,
    sidebarMaxWidth,
    panelMaxSize,
    showPages: isPagesShown,
    showPanel: customisedShowPanel,
    isDragging: internalDraggingSizeState.isDragging,
    dragCursor: internalDraggingSizeState.dragCursor,
  };
};

/** The grid areas of the desktop layout. */
const getGridTemplateAreas = (
  panelPosition: LayoutState['panelPosition'],
  showPanel: boolean,
  showSidebar: boolean
) => {
  if (!showSidebar && !showPanel) {
    return `"content content"
            "content content"`;
  }
  if (!showSidebar && showPanel) {
    if (panelPosition === 'right') {
      return `"content panel"
              "content panel"`;
    }
    return `"content content"
            "panel   panel"`;
  }
  if (!showPanel) {
    return `"sidebar content content"
            "sidebar content content"`;
  }
  if (panelPosition === 'right') {
    return `"sidebar content panel"
            "sidebar content panel"`;
  }
  return `"sidebar content content"
          "sidebar panel   panel"`;
};

export const Layout = ({ managerLayoutState, setManagerLayoutState, ...slots }: Props) => {
  const { isDesktop, isMobile } = useLayout();
  const api = useStorybookApi();
  // Subscribe to manager state so nav availability re-evaluates on route and layout changes.
  useStorybookState();
  const showSidebar = api.getNavAvailability() === 'shown';

  const {
    navSize,
    rightPanelWidth,
    bottomPanelHeight,
    panelPosition,
    panelResizerRef,
    sidebarResizerRef,
    sidebarMaxWidth,
    panelMaxSize,
    showPages,
    showPanel,
    isDragging,
    dragCursor,
  } = useLayoutSyncingState({ api, managerLayoutState, setManagerLayoutState, isDesktop });

  // Install landmark navigation listener in parent container of all landmarks.
  useLandmarkIndicator();

  return (
    <div
      className={styles.layout}
      style={
        {
          '--nav-width': `${navSize}px`,
          '--right-panel-width': `${rightPanelWidth}px`,
          '--bottom-panel-height': `${bottomPanelHeight}px`,
          '--grid-template-columns': showSidebar
            ? `minmax(0, var(--nav-width)) minmax(${MINIMUM_CONTENT_WIDTH_PX}px, 1fr) minmax(0, var(--right-panel-width))`
            : `minmax(${MINIMUM_CONTENT_WIDTH_PX}px, 1fr) minmax(0, var(--right-panel-width))`,
          '--grid-template-areas': getGridTemplateAreas(
            managerLayoutState.panelPosition,
            showPanel,
            showSidebar
          ),
        } as CSSProperties
      }
    >
      <>
        {isDesktop && showSidebar && (
          <SidebarContainer
            navSize={navSize}
            sidebarMaxWidth={sidebarMaxWidth}
            sidebarResizerRef={sidebarResizerRef}
          >
            {slots.slotSidebar}
          </SidebarContainer>
        )}
        {isMobile && !showPages && (
          <MobileNavigation
            className={styles.mobileNavigation}
            menu={slots.slotSidebar}
            panel={slots.slotPanel}
            showMenu={showSidebar}
            showPanel={showPanel}
          />
        )}

        <MainAreaContainer
          showPages={showPages}
          slotMain={slots.slotMain}
          slotPages={slots.slotPages}
        />

        {slots.slotOverlay && <div className={styles.contentOverlayCell}>{slots.slotOverlay}</div>}

        {isDesktop && showPanel && (
          <PanelContainer
            bottomPanelHeight={bottomPanelHeight}
            rightPanelWidth={rightPanelWidth}
            panelMaxSize={panelMaxSize}
            panelResizerRef={panelResizerRef}
            position={panelPosition}
          >
            {slots.slotPanel}
          </PanelContainer>
        )}
        {isMobile && !showPages && <Notifications />}
      </>
      {isDragging && <div className={styles.dragShield} style={{ cursor: dragCursor }} />}
    </div>
  );
};
