import type { ComponentProps, FC, HTMLAttributes, ReactElement, ReactNode } from 'react';
import React, { useId, useState } from 'react';

import { styled } from 'storybook/theming';

import { Bar } from '../Bar/Bar.tsx';
import { EmptyTabContent } from './EmptyTabContent.tsx';
import { TabList } from './TabList.tsx';
import { TabPanel } from './TabPanel.tsx';

export interface TabProps {
  id: string;
  'aria-label'?: string;
  title: FC | ReactNode | string;
  children?: FC | ReactNode;
  isDisabled?: boolean;
}

export interface useTabsStateProps {
  defaultSelected?: string;
  selected?: string;
  onSelectionChange?: (key: string) => void;
  tabs: TabProps[];
}

export interface TabsState {
  tabs: TabProps[];
  /** ID of the selected tab, or null when no tab can be selected. */
  selected: string | null;
  select: (key: string) => void;
  getTabId: (key: string) => string;
  getPanelId: (key: string) => string;
}

/** Shared state for a TabList and a TabPanel that render the same tabs. */
export const useTabsState = ({
  defaultSelected,
  onSelectionChange,
  selected,
  tabs,
}: useTabsStateProps): TabsState => {
  const id = useId();
  const [internalSelected, setInternalSelected] = useState(defaultSelected);
  const enabledTabs = tabs.filter(({ isDisabled }) => !isDisabled);

  // Like a native tab list, select the first enabled tab when the requested tab cannot be used.
  const requested = selected ?? internalSelected;
  const current = enabledTabs.some((tab) => tab.id === requested)
    ? requested!
    : (enabledTabs[0]?.id ?? null);

  return {
    tabs,
    selected: current,
    select: (key) => {
      setInternalSelected(key);
      onSelectionChange?.(key);
    },
    getTabId: (key) => `${id}-tab-${key}`,
    getPanelId: (key) => `${id}-panel-${key}`,
  };
};

export const Container = styled.div({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
});

export const FlexTabPanel = styled(TabPanel)(() => ({
  flex: 1,
  minHeight: 0,
}));

const FlexTabList = styled(TabList)<{ $simulatedGap: string | number }>(({ $simulatedGap }) => ({
  flex: '1 1 0%',
  '&:has(.tablist-has-scroll)': { marginInlineEnd: $simulatedGap },
}));

export interface TabsViewProps extends HTMLAttributes<HTMLDivElement> {
  /** List of tabs and their associated panel. */
  tabs: TabProps[];

  /** ID of the tab that should be selected on first render. */
  defaultSelected?: string;

  /** ID of the current tab if in controlled rendering mode. */
  selected?: string;

  /** Called when the selected tab changes, use if you want to control the component state. */
  onSelectionChange?: (key: string) => void;

  /**
   * Optional tools to avoid rendering two toolbars in a layout.
   *
   * @warning Only use this if the tools act upon the entire layout,
   * not upon a single tab panel. If you want to edit which tools are
   * visible based on the current tab, then you musn't use `tools` and
   * should handle your own toolbar inside the tabpanel instead.
   */
  tools?: ReactElement;

  /** Background color for the bar containing the tabs and tools. */
  backgroundColor?: string;

  /** Style properties for the inner layout container in the bar containing the tabs and tools. */
  barInnerStyle?: React.CSSProperties;

  /** Show tools instead of the empty state if there are no tabs. */
  showToolsWhenEmpty?: boolean;

  /** Custom UI for the empty state shown when there are no tabs. */
  emptyState?: ReactNode;

  /** Optional ID. */
  id?: string;

  /** Props to pass to the TabPanel component. */
  panelProps?: Omit<ComponentProps<typeof TabPanel>, 'state'>;
}

export const TabsView: FC<TabsViewProps> = ({
  backgroundColor,
  barInnerStyle,
  defaultSelected,
  emptyState,
  onSelectionChange,
  panelProps = {},
  selected,
  showToolsWhenEmpty,
  tabs,
  tools,
  ...props
}) => {
  const state = useTabsState({
    defaultSelected,
    onSelectionChange,
    selected,
    tabs,
  });

  const EmptyContent = emptyState ?? <EmptyTabContent title="Nothing found" />;
  const hasContent = tabs.length > 0;

  if (!showToolsWhenEmpty && !hasContent) {
    return EmptyContent;
  }

  return (
    <Container {...props}>
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
        {hasContent ? (
          <FlexTabList state={state} $simulatedGap={barInnerStyle?.gap ?? 6} />
        ) : (
          <div />
        )}
      </Bar>
      {hasContent ? <FlexTabPanel state={state} {...panelProps} /> : EmptyContent}
    </Container>
  );
};
