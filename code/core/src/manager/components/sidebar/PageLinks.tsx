import type { FC, MouseEvent } from 'react';
import React from 'react';

import {
  ALL_STORIES_PATH,
  HOME_PATH,
  buildManagerHref,
  getBasename,
} from '@aussieljk/forkbook/internal/router';
import { HouseIcon, ListIcon } from 'lucide-react';

import { useStorybookApi, useStorybookState } from '@aussieljk/forkbook/manager-api';

import { getRootPage } from '../../utils/root-page.ts';
import styles from './PageLinks.module.css';

export interface PageLinksViewProps {
  /** False hides the "Home" link (`root: false` in the main config). */
  showHome: boolean;
  /** The internal path of the current page. */
  activePath?: string;
  /** The `href` of an internal path. */
  getHref: (path: string) => string;
  /** Opens an internal path. A plain click calls it, so the page does not reload. */
  onNavigate: (path: string) => void;
}

/** The "Home" and "All stories" links at the top of the sidebar. */
export const PageLinksView: FC<PageLinksViewProps> = ({
  showHome,
  activePath,
  getHref,
  onNavigate,
}) => {
  const links = [
    ...(showHome ? [{ path: HOME_PATH, title: 'Home', icon: <HouseIcon /> }] : []),
    { path: ALL_STORIES_PATH, title: 'All stories', icon: <ListIcon /> },
  ];
  const onClick = (event: MouseEvent, path: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onNavigate(path);
  };
  return (
    <nav aria-label="Pages">
      <ul className={styles.list}>
        {links.map(({ path, title, icon }) => (
          <li key={path}>
            <a
              className={styles.link}
              href={getHref(path)}
              aria-current={activePath === path ? 'page' : undefined}
              onClick={(event) => onClick(event, path)}
            >
              {icon}
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

/** {@link PageLinksView} with the manager state and router. */
export const PageLinks: FC = () => {
  const api = useStorybookApi();
  const { path } = useStorybookState();
  return (
    <PageLinksView
      showHome={getRootPage().enabled}
      activePath={path}
      getHref={(target) => buildManagerHref(`${getBasename()}/`, target)}
      onNavigate={(target) => api.navigate(target)}
    />
  );
};
