import type { ComponentProps, FC } from 'react';
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';
import type { API_IndexHash, API_Refs } from '@aussieljk/forkbook/internal/types';

import { BottomBarToggleIcon, MenuIcon } from '@storybook/icons';

import {
  type API_KeyCollection,
  useStorybookApi,
  useStorybookState,
} from '@aussieljk/forkbook/manager-api';
import { clsx } from 'clsx';

import { useLandmark } from '../../../hooks/useLandmark.ts';
import { useLayout } from '../../layout/LayoutProvider.tsx';
import { MobileAddonsDrawer } from './MobileAddonsDrawer.tsx';
import { MobileMenuDrawer } from './MobileMenuDrawer.tsx';
import styles from './MobileNavigation.module.css';

interface MobileNavigationProps {
  menu?: React.ReactNode;
  panel?: React.ReactNode;
  showMenu?: boolean;
  showPanel: boolean;
}

// Function to combine all indexes
function combineIndexes(rootIndex: API_IndexHash | undefined, refs: API_Refs) {
  // Create a copy of the root index to avoid mutation
  const combinedIndex = { ...(rootIndex || {}) }; // Use an empty object as fallback

  // Traverse refs and merge each nested index with the root index
  Object.values(refs).forEach((ref) => {
    if (ref.index) {
      Object.assign(combinedIndex, ref.index);
    }
  });

  return combinedIndex;
}

/**
 * Walks the tree from the current story to combine story+component+folder names into a single
 * string
 */
const useFullStoryName = () => {
  const { index, refs } = useStorybookState();
  const api = useStorybookApi();
  const currentStory = api.getCurrentStoryData();

  // Merging every ref index allocates an object as large as the whole sidebar; only rebuild
  // it when the indexes actually change, not on every state-driven re-render.
  const combinedIndex = useMemo(() => combineIndexes(index, refs || {}), [index, refs]);

  if (!currentStory) {
    return { fullStoryAriaLabel: '', fullStoryName: '' };
  }
  // renderLabel may return any ReactNode; the bottom bar concatenates names into plain
  // strings (visible label and aria-label alike), so anything else falls back to the entry
  // name rather than stringifying to "[object Object]".
  const labelContext = { isMobile: true, location: 'bottom-bar' } as const;
  const storyLabel = currentStory.renderLabel?.(currentStory, api, labelContext);
  let fullStoryName = typeof storyLabel === 'string' ? storyLabel : currentStory.name;
  const storyAriaLabel = currentStory.renderAriaLabel?.(currentStory, api, labelContext);
  let fullStoryAriaLabel = typeof storyAriaLabel === 'string' ? storyAriaLabel : fullStoryName;

  let node = combinedIndex[currentStory.id];

  while (node && 'parent' in node && node.parent && combinedIndex[node.parent]) {
    node = combinedIndex[node.parent];
    const parentLabel = node.renderLabel?.(node, api, labelContext);
    const parentName = typeof parentLabel === 'string' ? parentLabel : node.name;
    const parentAriaOutput = node.renderAriaLabel?.(node, api, labelContext);
    const parentAriaLabel = typeof parentAriaOutput === 'string' ? parentAriaOutput : parentName;

    // Limit length of name shown in UI due to layout constraints.
    if (fullStoryName.length < 24) {
      fullStoryName = `${parentName}/${fullStoryName}`;
    }
    fullStoryAriaLabel = `${parentAriaLabel}/${fullStoryAriaLabel}`;
  }
  return { fullStoryAriaLabel, fullStoryName };
};

interface MobileBottomBarContentProps {
  fullStoryAriaLabel: string;
  fullStoryName: string;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (isOpen: boolean) => void;
  isMobilePanelOpen: boolean;
  setMobilePanelOpen: (isOpen: boolean) => void;
  showMenu: boolean;
  showPanel: boolean;
  navShortcut?: API_KeyCollection;
}

/**
 * The mobile bottom bar is split into its own component so that `useLandmark` is only invoked while
 * the underlying DOM element is mounted, and so its ref always points at the bar.
 */
const MobileBottomBarContent: FC<MobileBottomBarContentProps> = ({
  fullStoryAriaLabel,
  fullStoryName,
  isMobileMenuOpen,
  setMobileMenuOpen,
  isMobilePanelOpen,
  setMobilePanelOpen,
  showMenu,
  showPanel,
  navShortcut,
}) => {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const { landmarkProps } = useLandmark(
    { 'aria-labelledby': headingId, role: 'banner' },
    sectionRef
  );

  return (
    <header className={clsx('fb-bar', styles.bottomBar)} {...landmarkProps} ref={sectionRef}>
      <h2 id={headingId} className="fb-sr-only">
        Navigation controls
      </h2>
      {showMenu && (
        <Button
          className={styles.bottomBarButton}
          padding="small"
          variant="ghost"
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          ariaLabel="Open navigation menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls={isMobileMenuOpen ? 'storybook-mobile-menu' : undefined}
          shortcut={navShortcut}
        >
          <MenuIcon />
          <p className={styles.text}>{fullStoryName}</p>
        </Button>
      )}
      <span className="fb-sr-only" aria-current="page">
        Current page: {fullStoryAriaLabel}
      </span>
      {showPanel && (
        <Button
          className={styles.bottomBarButton}
          padding="small"
          variant="ghost"
          onClick={() => setMobilePanelOpen(true)}
          ariaLabel="Open addon panel"
          aria-expanded={isMobilePanelOpen}
          aria-controls={isMobilePanelOpen ? 'storybook-mobile-addon-panel' : undefined}
        >
          <BottomBarToggleIcon />
        </Button>
      )}
    </header>
  );
};

export const MobileNavigation: FC<MobileNavigationProps & ComponentProps<'section'>> = ({
  menu,
  panel,
  showMenu = true,
  showPanel,
  className,
  ...props
}) => {
  const { isMobilePanelOpen, setMobilePanelOpen } = useLayout();
  const { fullStoryAriaLabel, fullStoryName } = useFullStoryName();
  const api = useStorybookApi();
  // The drawer's open state is the manager-api layout field, the single source of truth. On mobile
  // `api.toggleNav()` flips this field, so the sidebar keyboard shortcut opens the drawer too.
  const { layout, ui } = useStorybookState();
  const isMobileMenuOpen = layout.showMobileNavigation;
  // Stable identity: the `showMenu` effect below lists this in its deps.
  const setMobileMenuOpen = useCallback((open: boolean) => api.setMobileNavigation(open), [api]);

  // Reset the drawer state when the mobile nav leaves the tree (e.g. resizing to desktop), so a
  // drawer left open on mobile does not linger as stale store state. Read `api` through a ref so the
  // reset only runs on unmount, not whenever the api identity changes.
  const apiRef = useRef(api);
  apiRef.current = api;
  useEffect(() => () => apiRef.current.setMobileNavigation(false), []);

  // Read `enableShortcuts` from the store, the same source the shortcut handler checks, so the
  // button never advertises a shortcut the handler would ignore.
  const enableShortcuts = ui.enableShortcuts ?? true;
  const navShortcut = enableShortcuts ? api.getShortcutKeys().toggleNav : undefined;

  useLayoutEffect(() => {
    if (!showMenu) {
      setMobileMenuOpen(false);
    }
  }, [showMenu, setMobileMenuOpen]);

  return (
    <section className={clsx(styles.container, className)} {...props}>
      {showMenu && (
        <MobileMenuDrawer
          id="storybook-mobile-menu"
          isOpen={isMobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
        >
          {menu}
        </MobileMenuDrawer>
      )}

      <MobileAddonsDrawer
        id="storybook-mobile-addon-panel"
        isOpen={isMobilePanelOpen}
        onOpenChange={setMobilePanelOpen}
      >
        {panel}
      </MobileAddonsDrawer>

      {!isMobilePanelOpen && (showMenu || showPanel) && (
        <MobileBottomBarContent
          fullStoryAriaLabel={fullStoryAriaLabel}
          fullStoryName={fullStoryName}
          isMobileMenuOpen={isMobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMobilePanelOpen={isMobilePanelOpen}
          setMobilePanelOpen={setMobilePanelOpen}
          showMenu={showMenu}
          showPanel={showPanel}
          navShortcut={navShortcut}
        />
      )}
    </section>
  );
};
