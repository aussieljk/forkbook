import * as React from 'react';

import { Button, TabsView } from '@aussieljk/forkbook/internal/components';

import {
  ArrowsClockwiseIcon,
  ArrowsInLineVerticalIcon,
  ArrowsOutSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@phosphor-icons/react';

import type { Result } from 'axe-core';
import { useTheme } from '@aussieljk/forkbook/theming';

import type { RuleType } from '../types.ts';
import { useA11yContext } from './A11yContext.tsx';
import styles from './Tabs.module.css';

interface TabsProps {
  tabs: {
    label: React.ReactElement;
    panel: React.ReactElement;
    items: Result[];
    type: RuleType;
  }[];
}

export const Tabs: React.FC<TabsProps> = ({ tabs }) => {
  const {
    tab,
    setTab,
    toggleHighlight,
    highlighted,
    handleManual,
    allExpanded,
    handleCollapseAll,
    handleExpandAll,
  } = useA11yContext();

  const theme = useTheme();

  return (
    <div className={styles.container}>
      <TabsView
        backgroundColor={theme.background.app}
        panelProps={{ hasScrollbar: true }}
        tabs={tabs.map((tab) => ({
          id: tab.type,
          title: tab.label,
          children: tab.panel,
        }))}
        selected={tab}
        // Safe to cast key to RuleType because we use RuleTypes as IDs above.
        onSelectionChange={(key) => setTab(key as RuleType)}
        tools={
          <div className={styles.actions}>
            <Button
              variant="ghost"
              padding="small"
              onClick={toggleHighlight}
              ariaLabel={
                highlighted
                  ? 'Hide accessibility test result highlights'
                  : 'Highlight elements with accessibility test results'
              }
            >
              {highlighted ? <EyeSlashIcon /> : <EyeIcon />}
            </Button>
            <Button
              variant="ghost"
              padding="small"
              onClick={allExpanded ? handleCollapseAll : handleExpandAll}
              ariaLabel={allExpanded ? 'Collapse all results' : 'Expand all results'}
              aria-expanded={allExpanded}
            >
              {allExpanded ? <ArrowsInLineVerticalIcon /> : <ArrowsOutSimpleIcon />}
            </Button>
            <Button
              variant="ghost"
              padding="small"
              onClick={handleManual}
              ariaLabel="Rerun accessibility scan"
            >
              <ArrowsClockwiseIcon />
            </Button>
          </div>
        }
      />
    </div>
  );
};
