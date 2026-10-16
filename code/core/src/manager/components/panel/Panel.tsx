import type { ReactNode } from 'react';
import React, { Component, useMemo, useRef } from 'react';

import {
  Button,
  EmptyTabContent,
  Link,
  StatelessTab,
  StatelessTabList,
  StatelessTabPanel,
  StatelessTabsView,
} from '@aussieljk/forkbook/internal/components';
import type { Addon_BaseType } from '@aussieljk/forkbook/internal/types';

import {
  FileTextIcon,
  SidebarSimpleIcon,
  SquareSplitVerticalIcon,
  XIcon,
} from '@phosphor-icons/react';

import type { State } from '@aussieljk/forkbook/manager-api';

import { focusableUIElements } from '../../../manager-api/modules/layout.ts';
import { useLandmark } from '../../hooks/useLandmark.ts';
import { useLayout } from '../layout/LayoutProvider.tsx';
import styles from './Panel.module.css';

export interface SafeTabProps {
  title: Addon_BaseType['title'];
  id: string;
  children: Addon_BaseType['render'];
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class TabErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error rendering addon panel');
    console.error(error);
    console.error(info.componentStack);
  }

  render() {
    const { hasError } = this.state;
    if (hasError) {
      return (
        <EmptyTabContent
          title="This addon has errors"
          description="Check your browser logs and addon code to pinpoint what went wrong. This issue was not caused by Forkbook."
        />
      );
    }

    const { children } = this.props;
    return children;
  }
}

// Ensures we don't cause difficult-to-debug hooks violations
// whether addon authors pass a React component ctor or anonymous function.
function renderChild(RenderProp: Addon_BaseType['render']) {
  return <RenderProp active={true} />;
}

// Avoids crashes due to rules of hooks.
const PreRenderAddons = ({ panels }: { panels: Record<string, Addon_BaseType> }) => {
  return Object.entries(panels).map(([k, v]) => (
    <StatelessTabPanel key={k} name={k} hasScrollbar={false}>
      <TabErrorBoundary key={k}>{renderChild(v.render)}</TabErrorBoundary>
    </StatelessTabPanel>
  ));
};

export const AddonPanel = React.memo<{
  selectedPanel?: string;
  actions: { onSelect: (id: string) => void } & Record<string, any>;
  panels: Record<string, Addon_BaseType>;
  shortcuts: State['shortcuts'];
  panelPosition?: 'bottom' | 'right';
  absolute?: boolean;
}>(({ panels, shortcuts, actions, selectedPanel = null, panelPosition = 'right' }) => {
  const { isDesktop, setMobilePanelOpen } = useLayout();

  const emptyState = (
    <EmptyTabContent
      title="Forkbook add-ons"
      description={
        <>Integrate your tools with Forkbook to connect workflows and unlock advanced features.</>
      }
      footer={
        <Link href={'https://forkbook.ljk.dev/addons'} target="_blank" withArrow>
          <FileTextIcon /> Explore integrations catalog
        </Link>
      }
    />
  );

  const tools = useMemo(
    () => (
      <div className={styles.actions}>
        {isDesktop ? (
          <>
            <Button
              key="position"
              padding="small"
              variant="ghost"
              onClick={actions.togglePosition}
              ariaLabel={
                panelPosition === 'bottom'
                  ? 'Move addon panel to right'
                  : 'Move addon panel to bottom'
              }
              ariaDescription="Changes the location of the addon panel to the bottom or right of the screen, but does not have any effect on its content."
              shortcut={shortcuts.panelPosition}
            >
              {panelPosition === 'bottom' ? <SidebarSimpleIcon /> : <SquareSplitVerticalIcon />}
            </Button>
            <Button
              key="visibility"
              padding="small"
              variant="ghost"
              onClick={actions.toggleVisibility}
              ariaLabel="Hide addon panel"
              shortcut={shortcuts.togglePanel}
            >
              <XIcon />
            </Button>
          </>
        ) : (
          <Button
            padding="small"
            variant="ghost"
            onClick={() => setMobilePanelOpen(false)}
            ariaLabel="Close addon panel"
          >
            <XIcon />
          </Button>
        )}
      </div>
    ),
    [actions, isDesktop, panelPosition, setMobilePanelOpen, shortcuts]
  );

  const asideRef = useRef<HTMLElement>(null);
  const { landmarkProps } = useLandmark(
    { 'aria-labelledby': 'storybook-panel-heading', role: 'region' },
    asideRef
  );

  return (
    <aside
      className={styles.aside}
      ref={asideRef}
      id={focusableUIElements.addonPanel}
      {...landmarkProps}
    >
      <h2 id="storybook-panel-heading" className="fb-sr-only">
        Addon panel
      </h2>
      <StatelessTabsView
        id={focusableUIElements.storyPanelRoot}
        showToolsWhenEmpty
        emptyState={emptyState}
        selected={selectedPanel ?? undefined}
        onSelectionChange={(id) => actions.onSelect(id)}
        tools={tools}
      >
        <StatelessTabList aria-label="Available addons">
          {Object.entries(panels).map(([k, v]) => (
            <StatelessTab key={k} name={k}>
              {typeof v.title === 'function' ? <v.title /> : v.title}
            </StatelessTab>
          ))}
        </StatelessTabList>
        {Object.keys(panels).length ? <PreRenderAddons panels={panels} /> : null}
      </StatelessTabsView>
    </aside>
  );
});

AddonPanel.displayName = 'AddonPanel';
