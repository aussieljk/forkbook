import type { ComponentProps, FC, ReactNode } from 'react';
import React from 'react';

import { Tabs } from '@base-ui/react/tabs';
import { clsx } from 'clsx';

import { ScrollArea } from '../ScrollArea/ScrollArea.tsx';
import styles from './StatelessTabPanel.module.css';

export interface StatelessTabPanelProps extends Omit<
  ComponentProps<typeof Tabs.Panel>,
  'value' | 'children'
> {
  /** Content of the tab panel. */
  children: ReactNode;

  /** Unique id of the TabPanel, must match that of its corresponding Tab. */
  name: string;

  /**
   * Whether the panel adds a vertical scrollbar. Disable if you want to use fixed or sticky
   * positioning on part of the tab's content. True by default.
   */
  hasScrollbar?: boolean;
}

export const StatelessTabPanel: FC<StatelessTabPanelProps> = ({
  children,
  hasScrollbar = true,
  keepMounted = true,
  name,
  className,
  ...rest
}) => {
  return (
    <Tabs.Panel
      {...rest}
      className={(state) =>
        clsx(styles.panel, typeof className === 'function' ? className(state) : className)
      }
      keepMounted={keepMounted}
      value={name}
    >
      {hasScrollbar ? <ScrollArea vertical>{children}</ScrollArea> : children}
    </Tabs.Panel>
  );
};
