import type { FC, HTMLAttributes } from 'react';
import React from 'react';

import { Tabs } from '@base-ui/react/tabs';

import { StatelessTab } from './StatelessTab.tsx';
import { StatelessTabList } from './StatelessTabList.tsx';
import type { TabsState } from './TabsView.tsx';

export interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  state: TabsState;
}

export const TabList: FC<TabListProps> = ({ state, ...rest }) => (
  <Tabs.Root {...rest} value={state.selected} onValueChange={state.select}>
    <StatelessTabList>
      {state.tabs.map(({ id, title: Title, isDisabled, 'aria-label': ariaLabel }) => (
        <StatelessTab
          key={id}
          name={id}
          id={state.getTabId(id)}
          aria-controls={state.getPanelId(id)}
          aria-label={ariaLabel}
          disabled={isDisabled}
          className={`tabbutton ${state.selected === id ? 'tabbutton-active' : ''}`}
        >
          {typeof Title === 'function' ? <Title /> : Title}
        </StatelessTab>
      ))}
    </StatelessTabList>
  </Tabs.Root>
);
