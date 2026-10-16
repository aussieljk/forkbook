import React, { Fragment, useCallback, useState } from 'react';

import { Button, Link, SyntaxHighlighter } from '@aussieljk/forkbook/internal/components';

import { CheckIcon, CopyIcon, CrosshairIcon } from '@phosphor-icons/react';

import { Tabs } from '@base-ui/react/tabs';

import { getFriendlySummaryForAxeResult } from '../../axeRuleMappingHelper.ts';
import type { EnhancedNodeResult, EnhancedResult, RuleType } from '../../types.ts';
import { useA11yContext } from '../A11yContext.tsx';
import styles from './Details.module.css';

const CopyButton = ({ onClick }: { onClick: () => void }) => {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(() => {
    onClick();
    setCopied(true);
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [onClick]);

  return (
    <Button ariaLabel={false} onClick={handleClick}>
      {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
};

interface DetailsProps {
  id: string;
  item: EnhancedResult;
  type: RuleType;
  selection: string | undefined;
  handleSelectionChange: (key: string) => void;
}

export const Details = ({ id, item, type, selection, handleSelectionChange }: DetailsProps) => (
  <div id={id} className={styles.wrapper}>
    <div className={styles.info}>
      <div className={styles.ruleId}>{item.id}</div>
      <p className={styles.description}>
        {getFriendlySummaryForAxeResult(item)}{' '}
        <Link href={item.helpUrl} target="_blank" rel="noopener noreferrer" withArrow>
          Learn how to resolve this violation
        </Link>
      </p>
    </div>

    <Tabs.Root
      orientation="vertical"
      value={selection ?? null}
      onValueChange={handleSelectionChange}
      render={<div className={styles.columns} />}
    >
      <Tabs.List activateOnFocus aria-label={type}>
        {item.nodes.map((node, index) => {
          const key = `${type}.${item.id}.${index + 1}`;
          return (
            <Fragment key={key}>
              <Tabs.Tab
                value={key}
                render={
                  <Button
                    className={styles.item}
                    ariaLabel={false}
                    variant="ghost"
                    size="medium"
                    id={key}
                  >
                    {index + 1}. {node.html}
                  </Button>
                }
              />
              <Tabs.Panel
                value={key}
                render={
                  <div className={styles.content} data-side="left">
                    {getContent(node)}
                  </div>
                }
              />
            </Fragment>
          );
        })}
      </Tabs.List>

      {item.nodes.map((node, index) => {
        const key = `${type}.${item.id}.${index + 1}`;
        return (
          <Tabs.Panel
            key={key}
            value={key}
            render={
              <div className={styles.content} data-side="right">
                {getContent(node)}
              </div>
            }
          />
        );
      })}
    </Tabs.Root>
  </div>
);

function getContent(node: EnhancedNodeResult) {
  const { handleCopyLink, handleJumpToElement } = useA11yContext();
  const { any, all, none, html, target } = node;
  const rules = [...any, ...all, ...none];
  return (
    <>
      <div className={styles.messages}>
        {rules.map((rule) => (
          <div key={rule.id}>
            {`${rule.message}${/(\.|: [^.]+\.*)$/.test(rule.message) ? '' : '.'}`}
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button ariaLabel={false} onClick={() => handleJumpToElement(node.target.toString())}>
          <CrosshairIcon /> Jump to element
        </Button>
        <CopyButton onClick={() => handleCopyLink(node.linkPath)} />
      </div>

      {/* Technically this is HTML but we use JSX to avoid using an HTML comment */}
      <SyntaxHighlighter
        className={styles.syntaxHighlighter}
        language="jsx"
        wrapLongLines
      >{`/* element */\n${html}`}</SyntaxHighlighter>

      <SyntaxHighlighter
        className={styles.syntaxHighlighter}
        language="css"
        wrapLongLines
      >{`/* selector */\n${target}`}</SyntaxHighlighter>
    </>
  );
}
