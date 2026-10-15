import type { ComponentProps, FC } from 'react';
import React from 'react';

import { Tabs } from '@base-ui/react/tabs';
import { clsx } from 'clsx';

import styles from './StatelessTab.module.css';

export interface StatelessTabProps extends Omit<ComponentProps<typeof Tabs.Tab>, 'value'> {
  /** Unique id of the Tab, must match that of its corresponding TabPanel. */
  name: string;

  /** Tab button content */
  children: React.ReactNode;
}

export const StatelessTab: FC<StatelessTabProps> = ({ name, className, ...props }) => {
  return (
    <Tabs.Tab
      value={name}
      className={(state) =>
        clsx(styles.tab, typeof className === 'function' ? className(state) : className)
      }
      {...props}
    />
  );
};
