import React, { useCallback, useMemo } from 'react';

import { ActionList } from '@aussieljk/forkbook/internal/components';
import { STORIES_COLLAPSE_ALL } from '@aussieljk/forkbook/internal/core-events';

import { CheckIcon, CommandIcon, DocumentIcon, InfoIcon, ShareAltIcon } from '@storybook/icons';

import type { API } from '@aussieljk/forkbook/manager-api';

import type { NormalLink } from '../../components/components/tooltip/TooltipLinkList.tsx';
import { Shortcut } from '../components/Shortcut.tsx';

export type MenuItem = NormalLink & {
  closeOnClick?: boolean;
  internal?: boolean;
};

export const useMenu = ({
  api,
  showToolbar,
  isPanelShown,
  isNavShown,
  enableShortcuts,
}: {
  api: API;
  showToolbar: boolean;
  isPanelShown: boolean;
  isNavShown: boolean;
  enableShortcuts: boolean;
}): MenuItem[][] => {
  const shortcutKeys = api.getShortcutKeys();

  const about = useMemo(
    () => ({
      id: 'about',
      title: 'About your Forkbook',
      onClick: () => api.changeSettingsTab('about'),
      href: './?path=/settings/about',
      internal: true,
      closeOnClick: true,
      icon: <InfoIcon />,
    }),
    [api]
  );

  const shortcuts = useMemo(
    () => ({
      id: 'shortcuts',
      title: 'Keyboard shortcuts',
      onClick: () => api.changeSettingsTab('shortcuts'),
      href: './?path=/settings/shortcuts',
      internal: true,
      closeOnClick: true,
      right: enableShortcuts ? <Shortcut keys={shortcutKeys.shortcutsPage} /> : null,
      icon: <CommandIcon />,
    }),
    [api, enableShortcuts, shortcutKeys.shortcutsPage]
  );

  const sidebarToggle = useMemo(
    () => ({
      id: 'S',
      title: 'Show sidebar',
      onClick: () => api.toggleNav(),
      closeOnClick: true,
      active: isNavShown,
      right: enableShortcuts ? <Shortcut keys={shortcutKeys.toggleNav} /> : null,
      icon: isNavShown ? <CheckIcon /> : <></>,
    }),
    [api, enableShortcuts, shortcutKeys, isNavShown]
  );

  const toolbarToogle = useMemo(
    () => ({
      id: 'T',
      title: 'Show toolbar',
      onClick: () => api.toggleToolbar(),
      active: showToolbar,
      right: enableShortcuts ? <Shortcut keys={shortcutKeys.toolbar} /> : null,
      icon: showToolbar ? <CheckIcon /> : <></>,
    }),
    [api, enableShortcuts, shortcutKeys, showToolbar]
  );

  const addonsToggle = useMemo(
    () => ({
      id: 'A',
      title: 'Show addons panel',
      onClick: () => api.togglePanel(),
      active: isPanelShown,
      right: enableShortcuts ? <Shortcut keys={shortcutKeys.togglePanel} /> : null,
      icon: isPanelShown ? <CheckIcon /> : <></>,
    }),
    [api, enableShortcuts, shortcutKeys, isPanelShown]
  );

  const up = useMemo(
    () => ({
      id: 'up',
      title: 'Previous component',
      onClick: () => api.jumpToComponent(-1),
      right: enableShortcuts ? <Shortcut keys={shortcutKeys.prevComponent} /> : null,
      icon: <></>,
    }),
    [api, enableShortcuts, shortcutKeys]
  );

  const down = useMemo(
    () => ({
      id: 'down',
      title: 'Next component',
      onClick: () => api.jumpToComponent(1),
      right: enableShortcuts ? <Shortcut keys={shortcutKeys.nextComponent} /> : null,
      icon: <></>,
    }),
    [api, enableShortcuts, shortcutKeys]
  );

  const prev = useMemo(
    () => ({
      id: 'prev',
      title: 'Previous story',
      onClick: () => api.jumpToStory(-1),
      right: enableShortcuts ? <Shortcut keys={shortcutKeys.prevStory} /> : null,
      icon: <></>,
    }),
    [api, enableShortcuts, shortcutKeys]
  );

  const next = useMemo(
    () => ({
      id: 'next',
      title: 'Next story',
      onClick: () => api.jumpToStory(1),
      right: enableShortcuts ? <Shortcut keys={shortcutKeys.nextStory} /> : null,
      icon: <></>,
    }),
    [api, enableShortcuts, shortcutKeys]
  );

  const collapse = useMemo(
    () => ({
      id: 'collapse',
      title: 'Collapse all',
      onClick: () => api.emit(STORIES_COLLAPSE_ALL),
      right: enableShortcuts ? <Shortcut keys={shortcutKeys.collapseAll} /> : null,
      icon: <></>,
    }),
    [api, enableShortcuts, shortcutKeys]
  );

  const documentation = useMemo(() => {
    const docsUrl = api.getDocsUrl({ versioned: true, renderer: true });

    return {
      id: 'documentation',
      title: 'Documentation',
      closeOnClick: true,
      href: docsUrl,
      right: (
        <ActionList.Icon>
          <ShareAltIcon />
        </ActionList.Icon>
      ),
      icon: <DocumentIcon />,
    };
  }, [api]);

  const getAddonsShortcuts = useCallback(() => {
    const addonsShortcuts = api.getAddonsShortcuts();
    const keys = shortcutKeys as any;
    return Object.entries(addonsShortcuts)
      .filter(([_, { showInMenu }]) => showInMenu)
      .map(([actionName, { label, action }]) => ({
        id: actionName,
        title: label,
        onClick: () => action(),
        right: enableShortcuts && keys[actionName] ? <Shortcut keys={keys[actionName]} /> : null,
      }));
  }, [api, enableShortcuts, shortcutKeys]);

  return useMemo(
    () =>
      [
        [about, ...(enableShortcuts ? [shortcuts] : [])],
        [sidebarToggle, toolbarToogle, addonsToggle, up, down, prev, next, collapse],
        getAddonsShortcuts(),
        [documentation],
      ] satisfies NormalLink[][],
    [
      about,
      documentation,
      shortcuts,
      sidebarToggle,
      toolbarToogle,
      addonsToggle,
      up,
      down,
      prev,
      next,
      collapse,
      getAddonsShortcuts,
      enableShortcuts,
    ]
  );
};
