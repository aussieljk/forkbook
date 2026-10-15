import type { FC } from 'react';
import React, { useState } from 'react';

import { PopoverProvider, SyntaxHighlighter, codeCommon } from 'storybook/internal/components';

import { ChevronSmallDownIcon, ChevronSmallUpIcon } from '@storybook/icons';

import { clsx } from 'clsx';
import { uniq } from 'es-toolkit/array';

import type { PropSummaryValue } from './types';
import styles from './ArgValue.module.css';

interface ArgValueProps {
  value?: PropSummaryValue;
  initialExpandedArgs?: boolean;
}

interface ArgTextProps {
  text: string;
  simple?: boolean;
}

interface ArgSummaryProps {
  value: PropSummaryValue;
  initialExpandedArgs?: boolean;
}

const ITEMS_BEFORE_EXPANSION = 8;

const EmptyArg = () => {
  return <span>-</span>;
};

const ArgText: FC<ArgTextProps> = ({ text, simple }) => {
  return (
    <span className={clsx(codeCommon, styles.text)} data-simple={simple || undefined}>
      {text}
    </span>
  );
};

const getSummaryItems = (summary: string) => {
  if (!summary) {
    return [summary];
  }
  const splittedItems = summary.split('|');
  const summaryItems = splittedItems.map((value) => value.trim());

  return uniq(summaryItems);
};

const renderSummaryItems = (summaryItems: string[]) => {
  return summaryItems
    .slice(0, ITEMS_BEFORE_EXPANSION)
    .map((item) => <ArgText key={item} text={item === '' ? '""' : item} />);
};

const renderExpandedItems = (summaryItems: string[]) => {
  return summaryItems
    .slice(ITEMS_BEFORE_EXPANSION)
    .map((item) => <ArgText key={item} text={item === '' ? '""' : item} />);
};

const ArgSummary: FC<ArgSummaryProps> = ({ value, initialExpandedArgs }) => {
  const { summary, detail } = value;

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(initialExpandedArgs || false);

  if (summary === undefined || summary === null) {
    return null;
  }
  // summary is used for the default value
  // below check fixes not displaying default values for boolean typescript vars
  // summary is used for the default value
  // below check fixes not displaying default values for boolean typescript vars
  const summaryAsString = typeof summary.toString === 'function' ? summary.toString() : summary;

  if (detail == null) {
    const cannotBeSafelySplitted = /[(){}[\]<>]/.test(summaryAsString);

    if (cannotBeSafelySplitted) {
      return <ArgText text={summaryAsString} />;
    }

    const summaryItems = getSummaryItems(summaryAsString);
    const itemsCount = summaryItems.length;
    const hasManyItems = itemsCount > ITEMS_BEFORE_EXPANSION;

    return hasManyItems ? (
      <div className={styles.summary} data-expanded={isExpanded || undefined}>
        {renderSummaryItems(summaryItems)}
        <details
          className={styles.detailsContainer}
          open={isExpanded}
          onToggle={(e) => setIsExpanded(e.currentTarget.open)}
        >
          <div className={styles.alignedDetails}>{renderExpandedItems(summaryItems)}</div>
          <summary className={styles.expandButton} role="button">
            {isExpanded ? 'Show less...' : `Show ${itemsCount - ITEMS_BEFORE_EXPANSION} more...`}
          </summary>
        </details>
      </div>
    ) : (
      <div className={styles.summary}>{renderSummaryItems(summaryItems)}</div>
    );
  }

  return (
    <PopoverProvider
      ariaLabel="Arg value details"
      placement="bottom"
      visible={isOpen}
      onVisibleChange={(isVisible) => {
        setIsOpen(isVisible);
      }}
      hasCloseButton
      popover={
        <div className={styles.detail}>
          <SyntaxHighlighter language="jsx" format={false}>
            {detail}
          </SyntaxHighlighter>
        </div>
      }
    >
      <button className={clsx(codeCommon, styles.expandable, 'sbdocs-expandable')}>
        <span>{summaryAsString}</span>
        {isOpen ? (
          <ChevronSmallUpIcon className={styles.chevron} />
        ) : (
          <ChevronSmallDownIcon className={styles.chevron} />
        )}
      </button>
    </PopoverProvider>
  );
};

export const ArgValue: FC<ArgValueProps> = ({ value, initialExpandedArgs }) => {
  return value == null ? (
    <EmptyArg />
  ) : (
    <ArgSummary value={value} initialExpandedArgs={initialExpandedArgs} />
  );
};
