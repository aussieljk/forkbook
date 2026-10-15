import type { FC, ReactNode } from 'react';
import React, { isValidElement, useState } from 'react';

import { Tabs } from '@base-ui/react/tabs';
import { styled } from 'storybook/theming';

import { Bar } from '../Bar/Bar.tsx';
import { EmptyTabContent } from './EmptyTabContent.tsx';
import type { TabsViewProps } from './TabsView.tsx';

const Container = styled(Tabs.Root)<{ $simulatedGap: string | number }>(({ $simulatedGap }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',

  '.tablist': {
    flex: '1 1 100%',
  },

  '.tablist.tablist-has-scroll': {
    marginInlineEnd: $simulatedGap,
  },

  '& > :not(:first-child)': { flex: 1 },
}));

/** Reads the `name` of each StatelessTab passed to the StatelessTabList. */
const getTabNames = (tabList: ReactNode): string[] =>
  isValidElement<{ children?: ReactNode }>(tabList)
    ? React.Children.toArray(tabList.props.children).flatMap((tab) =>
        isValidElement<{ name?: string }>(tab) && tab.props.name ? [tab.props.name] : []
      )
    : [];

export interface StatelessTabsViewProps extends Omit<TabsViewProps, 'tabs'> {
  children: ReactNode;
}

export const StatelessTabsView: FC<StatelessTabsViewProps> = ({
  backgroundColor,
  barInnerStyle,
  children,
  defaultSelected,
  emptyState,
  onSelectionChange,
  selected,
  showToolsWhenEmpty,
  tools,
  ...props
}) => {
  const [internalSelected, setInternalSelected] = useState(defaultSelected);
  const EmptyContent = emptyState ?? <EmptyTabContent title="Nothing found" />;
  const [tabListChild, ...tabPanelChildren] = React.Children.toArray(children);
  const hasContent = tabPanelChildren && tabPanelChildren.length > 0;

  if (!showToolsWhenEmpty && !hasContent) {
    return EmptyContent;
  }

  // Like a native tab list, select the first tab when the requested tab does not exist.
  const tabNames = getTabNames(tabListChild);
  const requested = selected ?? internalSelected;
  const isKnown = (name: string) => tabNames.length === 0 || tabNames.includes(name);
  const value = requested && isKnown(requested) ? requested : (tabNames[0] ?? null);

  return (
    <Container
      {...props}
      $simulatedGap={barInnerStyle?.gap ?? 6}
      value={value}
      onValueChange={(key: string) => {
        setInternalSelected(key);
        onSelectionChange?.(key);
      }}
    >
      <Bar
        scrollable={false}
        border
        backgroundColor={backgroundColor}
        innerStyle={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingInlineStart: 0,
          paddingInlineEnd: 10,
          // A11y: the tools must be before the tab list in the DOM for correct tab order.
          // This lets us control order without adding a wrapper div, leading to better flex
          // behavior on tools for our callees (e.g. containerType: 'inline-size' in a11y-addon).
          '> *:not(:last-child)': {
            order: 2,
          },
          '> *': {
            flexShrink: 0,
          },
          ...barInnerStyle,
          gap: 0,
        }}
      >
        {tools}
        {hasContent ? tabListChild : <div />}
      </Bar>
      {hasContent ? tabPanelChildren : EmptyContent}
    </Container>
  );
};
