import type { ComponentProps, FC } from 'react';
import React from 'react';

import { Badge, Button, EmptyTabContent } from '@aussieljk/forkbook/internal/components';

import { ChevronDownIcon } from 'lucide-react';

import type { ImpactValue } from 'axe-core';

import { getTitleForAxeResult } from '../../axeRuleMappingHelper.ts';
import { type EnhancedResult, RuleType } from '../../types.ts';
import { Details } from './Details.tsx';
import styles from './Report.module.css';

const impactStatus: Record<NonNullable<ImpactValue>, ComponentProps<typeof Badge>['status']> = {
  minor: 'neutral',
  moderate: 'warning',
  serious: 'negative',
  critical: 'critical',
};

const impactLabels: Record<NonNullable<ImpactValue>, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  serious: 'Serious',
  critical: 'Critical',
};

export interface ReportProps {
  items: EnhancedResult[];
  empty: string;
  type: RuleType;
  handleSelectionChange: (key: string) => void;
  selectedItems: Map<EnhancedResult['id'], string>;
  toggleOpen: (event: React.SyntheticEvent<Element>, type: RuleType, item: EnhancedResult) => void;
}

export const Report: FC<ReportProps> = ({
  items,
  empty,
  type,
  handleSelectionChange,
  selectedItems,
  toggleOpen,
}) => (
  <>
    {items && items.length ? (
      items.map((item) => {
        const id = `${type}.${item.id}`;
        const detailsId = `details:${id}`;
        const selection = selectedItems.get(id);
        const title = getTitleForAxeResult(item);
        return (
          <div key={id} className={styles.wrapper}>
            <div
              className={styles.headerBar}
              onClick={(event) => toggleOpen(event, type, item)}
              data-active={!!selection}
            >
              <div className={styles.title}>
                <strong>{title}</strong>
                <div className={styles.ruleId}>{item.id}</div>
              </div>
              {item.impact && (
                <Badge status={type === RuleType.PASS ? 'neutral' : impactStatus[item.impact]}>
                  {impactLabels[item.impact]}
                </Badge>
              )}
              <div className={styles.count}>{item.nodes.length}</div>
              <Button
                onClick={(event) => toggleOpen(event, type, item)}
                ariaLabel={`${selection ? 'Collapse' : 'Expand'} details for: ${title}`}
                aria-expanded={!!selection}
                aria-controls={detailsId}
                variant="ghost"
                padding="small"
              >
                <ChevronDownIcon
                  className={styles.icon}
                  style={{ transform: `rotate(${selection ? -180 : 0}deg)` }}
                />
              </Button>
            </div>
            {selection ? (
              <Details
                id={detailsId}
                item={item}
                type={type}
                selection={selection}
                handleSelectionChange={handleSelectionChange}
              />
            ) : (
              <div id={detailsId} />
            )}
          </div>
        );
      })
    ) : (
      <EmptyTabContent title={empty} />
    )}
  </>
);
