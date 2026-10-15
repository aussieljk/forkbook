import type { FC, HTMLAttributes } from 'react';
import React from 'react';

import { Tabs } from '@base-ui/react/tabs';

import { StatelessTabPanel } from './StatelessTabPanel.tsx';
import type { TabsState } from './TabsView.tsx';

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** The state of the tab list. Primary mechanism for using the tabpanel. */
  state: TabsState;

  /**
   * Whether the panel adds a vertical scrollbar. Disable if you want to use fixed or sticky
   * positioning on part of the tab's content. True by default.
   */
  hasScrollbar?: boolean;

  /**
   * Whether to render only the active tab's content, or all tabs. When true, non-selected tabs are
   * rendered with the hidden attribute and do not affect the accessibility object model.
   */
  renderAllChildren?: boolean;
}

export const TabPanel: FC<TabPanelProps> = ({
  hasScrollbar = true,
  renderAllChildren = false,
  state,
  ...rest
}) => (
  <Tabs.Root {...rest} value={state.selected}>
    {state.tabs.map(({ id, children: Children }) => (
      <StatelessTabPanel
        key={id}
        name={id}
        id={state.getPanelId(id)}
        aria-labelledby={state.getTabId(id)}
        keepMounted={renderAllChildren}
        hasScrollbar={hasScrollbar}
      >
        {typeof Children === 'function' ? <Children /> : Children}
      </StatelessTabPanel>
    ))}
  </Tabs.Root>
);
