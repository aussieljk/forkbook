import type { FC, ReactNode, SyntheticEvent } from 'react';
import React, { useMemo } from 'react';

import { Button, ScrollArea, TabsView } from '@aussieljk/forkbook/internal/components';
import { Location, Route } from '@aussieljk/forkbook/internal/router';
import type { Addon_PageType } from '@aussieljk/forkbook/internal/types';
import { Addon_TypesEnum } from '@aussieljk/forkbook/internal/types';

import { global } from '../../shared/global.ts';
import { XIcon } from '@phosphor-icons/react';

import { types, useStorybookApi, useStorybookState } from '@aussieljk/forkbook/manager-api';

import { menuTool } from '../components/preview/tools/menu.tsx';
import { matchesKeyCode, matchesModifiers } from '../keybinding.ts';
import { AboutPage } from './AboutPage.tsx';
import { ShortcutsPage } from './ShortcutsPage.tsx';
import { WhatsNewPage } from './whats_new_page.tsx';
import styles from './index.module.css';

const { document } = global;

const RouteWrapper: FC<{ children: ReactNode; path: string }> = ({ children, path }) => {
  return (
    <ScrollArea className={styles.content} vertical horizontal={false}>
      <Route path={path}>{children}</Route>
    </ScrollArea>
  );
};

const Pages: FC<{
  onClose: () => void;
  enableShortcuts?: boolean;
  changeTab: (tab: string) => void;
  enableWhatsNew: boolean;
}> = ({ changeTab, onClose, enableShortcuts = true, enableWhatsNew }) => {
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (!enableShortcuts || event.repeat) {
        return;
      }
      if (matchesModifiers(false, event) && matchesKeyCode('Escape', event)) {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [enableShortcuts, onClose]);

  const api = useStorybookApi();
  const toolsExtra = Object.values(api.getElements(Addon_TypesEnum.TOOLEXTRA));

  const tabs = useMemo(() => {
    const tabsToInclude = [
      {
        id: 'about',
        title: 'About',
        children: (
          <RouteWrapper path="about">
            <AboutPage key="about" />
          </RouteWrapper>
        ),
      },
    ];

    tabsToInclude.push({
      id: 'shortcuts',
      title: 'Keyboard shortcuts',
      children: (
        <RouteWrapper path="shortcuts">
          <ShortcutsPage key="shortcuts" />
        </RouteWrapper>
      ),
    });

    if (enableWhatsNew) {
      tabsToInclude.push({
        id: 'whats-new',
        title: "What's new?",
        children: (
          <RouteWrapper path="whats-new">
            <WhatsNewPage key="whats-new" />
          </RouteWrapper>
        ),
      });
    }

    return tabsToInclude;
  }, [enableWhatsNew]);

  return (
    <Location>
      {({ path }) => {
        const selected = tabs.find((tab) => path.includes(`settings/${tab.id}`))?.id;
        return (
          <TabsView
            tabs={tabs}
            tools={
              <>
                <div className={styles.sidebarToggle}>{menuTool.render({})}</div>
                {toolsExtra.map((item) => (
                  <React.Fragment key={item.id}>{item.render({})}</React.Fragment>
                ))}
                <Button
                  padding="small"
                  variant="ghost"
                  onClick={(e: SyntheticEvent) => {
                    e.preventDefault();
                    return onClose();
                  }}
                  ariaLabel="Close settings page"
                >
                  <XIcon />
                </Button>
              </>
            }
            selected={selected}
            onSelectionChange={changeTab}
          />
        );
      }}
    </Location>
  );
};

const SettingsPages: FC = () => {
  const api = useStorybookApi();
  const state = useStorybookState();
  const changeTab = (tab: string) => api.changeSettingsTab(tab);

  return (
    <Pages
      enableWhatsNew={state.whatsNewData?.status === 'SUCCESS'}
      enableShortcuts={state.ui.enableShortcuts}
      changeTab={changeTab}
      onClose={api.closeSettings}
    />
  );
};

export const settingsPageAddon: Addon_PageType = {
  id: 'settings',
  url: '/settings/',
  title: 'Settings',
  type: types.experimental_PAGE,
  render: () => (
    <Route path="/settings/" startsWith>
      <SettingsPages />
    </Route>
  ),
};
