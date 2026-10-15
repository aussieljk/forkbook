import type { ComponentProps, FC, ReactNode } from 'react';
import React from 'react';

import { Tabs } from '@base-ui/react/tabs';
import { styled } from 'storybook/theming';

import { ScrollArea } from '../ScrollArea/ScrollArea.tsx';

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

const Root = styled(Tabs.Panel)({
  overflowY: 'hidden',
  height: '100%',
  display: 'block',
  '&[hidden]': { display: 'none' },
});

export const StatelessTabPanel: FC<StatelessTabPanelProps> = ({
  children,
  hasScrollbar = true,
  keepMounted = true,
  name,
  ...rest
}) => {
  return (
    <Root {...rest} keepMounted={keepMounted} value={name}>
      {hasScrollbar ? <ScrollArea vertical>{children}</ScrollArea> : children}
    </Root>
  );
};
