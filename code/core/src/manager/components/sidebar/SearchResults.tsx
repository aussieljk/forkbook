import type { FC, MouseEventHandler, PropsWithChildren, ReactNode } from 'react';
import React, { useCallback, useEffect } from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';
import { PRELOAD_ENTRIES } from '@aussieljk/forkbook/internal/core-events';

import { global } from '@storybook/global';
import { TrashIcon } from '@phosphor-icons/react';

import type { ControllerStateAndHelpers } from 'downshift';
import { clsx } from 'clsx';
import { useStorybookApi } from '@aussieljk/forkbook/manager-api';
import { useTheme } from '@aussieljk/forkbook/theming';

import { matchesKeyCode, matchesModifiers } from '../../keybinding.ts';
import { getStatus } from '../../utils/status.tsx';
import { UseSymbol } from './IconSymbols.tsx';
import { NoResults } from './NoResults.tsx';
import { StatusLabel } from './StatusButton.tsx';
import { TypeIcon } from './TreeNode.tsx';
import type { DownshiftItem, Match, SearchResult } from './types.ts';
import { isExpandType } from './types.ts';
import styles from './SearchResults.module.css';

const { document } = global;

const Highlight: FC<PropsWithChildren<{ match?: Match }>> = React.memo(function Highlight({
  children,
  match,
}) {
  if (!match) {
    return children;
  }
  const { value, indices } = match;
  const { nodes: result } = indices.reduce<{ cursor: number; nodes: ReactNode[] }>(
    ({ cursor, nodes }, [start, end], index, { length }) => {
      nodes.push(<span key={`${index}-1`}>{value.slice(cursor, start)}</span>);
      nodes.push(
        <mark className={styles.mark} key={`${index}-2`}>
          {value.slice(start, end + 1)}
        </mark>
      );
      if (index === length - 1) {
        nodes.push(<span key={`${index}-3`}>{value.slice(end + 1)}</span>);
      }
      return { cursor: end + 1, nodes };
    },
    { cursor: 0, nodes: [] }
  );
  return <span>{result}</span>;
});

const Result: FC<
  SearchResult & {
    isHighlighted: boolean;
  } & React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>
> = React.memo(function Result({ item, matches, onClick, isHighlighted, className, ...props }) {
  const theme = useTheme();
  const click: MouseEventHandler<HTMLLIElement> = useCallback(
    (event) => {
      event.preventDefault();
      onClick?.(event);
    },
    [onClick]
  );

  const api = useStorybookApi();
  useEffect(() => {
    if (api && isHighlighted && item.type === 'component') {
      api.emit(PRELOAD_ENTRIES, { ids: [item.children[0]] }, { options: { target: item.refId } });
    }
  }, [api, isHighlighted, item]);

  const nameMatch = matches.find((match: Match) => match.key === 'name');
  const pathMatches = matches.filter((match: Match) => match.key === 'path');

  const icon = item.status ? getStatus(theme, item.status).icon : null;

  return (
    <li
      className={clsx(styles.resultRow, className)}
      data-highlighted={isHighlighted || undefined}
      {...props}
      onClick={click}
    >
      <div className={styles.iconWrapper}>
        {item.type === 'component' && (
          <TypeIcon viewBox="0 0 14 14" width="14" height="14" type="component">
            <UseSymbol type="component" />
          </TypeIcon>
        )}
        {item.type === 'story' && (
          <TypeIcon viewBox="0 0 14 14" width="14" height="14" type={item.subtype}>
            <UseSymbol type={item.subtype} />
          </TypeIcon>
        )}
        {!(item.type === 'component' || item.type === 'story') && (
          <TypeIcon viewBox="0 0 14 14" width="14" height="14" type="document">
            <UseSymbol type="document" />
          </TypeIcon>
        )}
      </div>
      <div className={clsx(styles.resultRowContent, 'search-result-item--label')}>
        <div className={styles.title}>
          <Highlight match={nameMatch}>{item.name}</Highlight>
        </div>
        <div className={styles.path}>
          {item.path.map((group, index) => (
            <span key={index}>
              <Highlight match={pathMatches.find((match: Match) => match.arrayIndex === index)}>
                {group}
              </Highlight>
            </span>
          ))}
        </div>
      </div>
      {item.status ? <StatusLabel status={item.status}>{icon}</StatusLabel> : null}
    </li>
  );
});

export const SearchResults: FC<{
  query: string;
  results: DownshiftItem[];
  closeMenu: (cb?: () => void) => void;
  getMenuProps: ControllerStateAndHelpers<DownshiftItem>['getMenuProps'];
  getItemProps: ControllerStateAndHelpers<DownshiftItem>['getItemProps'];
  highlightedIndex: number | null;
  isLoading?: boolean;
  enableShortcuts?: boolean;
  clearLastViewed?: () => void;
}> = React.memo(function SearchResults({
  query,
  results,
  closeMenu,
  getMenuProps,
  getItemProps,
  highlightedIndex,
  isLoading = false,
  enableShortcuts = true,
  clearLastViewed,
}) {
  const api = useStorybookApi();
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (!enableShortcuts || isLoading || event.repeat) {
        return;
      }
      if (matchesModifiers(false, event) && matchesKeyCode('Escape', event)) {
        const target = event.target as Element;

        if (target?.id === 'storybook-explorer-searchfield') {
          return; // handled by downshift
        }
        event.preventDefault();
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeMenu, enableShortcuts, isLoading]);

  const mouseOverHandler: MouseEventHandler = useCallback((event) => {
    if (!api) {
      return;
    }
    const currentTarget = event.currentTarget as HTMLElement;
    const storyId = currentTarget.getAttribute('data-id');
    const refId = currentTarget.getAttribute('data-refid');
    // @ts-expect-error (non strict)
    const item = api.resolveStory(storyId, refId === 'storybook_internal' ? undefined : refId);

    if (item?.type === 'component') {
      api.emit(PRELOAD_ENTRIES, {
        // @ts-expect-error (TODO)
        ids: [item.isLeaf ? item.id : item.children[0]],
        options: { target: refId },
      });
    }
  }, []);

  const handleClearLastViewed = () => {
    // @ts-expect-error (non strict)
    clearLastViewed();
    closeMenu();
  };

  return (
    <ol className={styles.resultsList} {...getMenuProps()} key="results-list">
      {results.length > 0 && !query && (
        <div className={clsx(styles.recentlyOpenedTitle, 'search-result-recentlyOpened')}>
          Recently opened
          <Button
            padding="small"
            variant="ghost"
            className="search-result-recentlyOpened-clear"
            onClick={handleClearLastViewed}
            ariaLabel="Clear recently opened items"
          >
            <TrashIcon />
          </Button>
        </div>
      )}
      {results.length === 0 && query && (
        <li>
          <NoResults>
            <strong>No components found</strong>
            <small>Find components by name or path.</small>
          </NoResults>
        </li>
      )}
      {results.map((result: DownshiftItem, index) => {
        if (isExpandType(result)) {
          const props = { ...results, ...getItemProps({ key: index, index, item: result }) };
          const { key, ...rest } = props;
          return (
            <div className={styles.moreWrapper} key="search-result-expand">
              <Button key={key} {...rest} size="small">
                Show {result.moreCount} more results
              </Button>
            </div>
          );
        }

        const { item } = result;
        const key = `${item.refId}::${item.id}`;
        return (
          <Result
            {...result}
            {...getItemProps({ key, index, item: result })}
            isHighlighted={highlightedIndex === index}
            key={key}
            data-id={result.item.id}
            data-refid={result.item.refId}
            onMouseOver={mouseOverHandler}
            className="search-result-item"
          />
        );
      })}
    </ol>
  );
});
