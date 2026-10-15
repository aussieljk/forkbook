import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { deprecate } from 'storybook/internal/client-logger';
import { sanitize } from 'storybook/internal/csf';

import useResizeObserver from 'use-resize-observer';

import { PopoverProvider } from '../Popover/PopoverProvider.tsx';
import { TooltipLinkList } from '../tooltip/TooltipLinkList.tsx';
import type { Link } from '../tooltip/TooltipLinkList.tsx';
import { TabButton } from './Button.tsx';
import type { ChildrenListComplete } from './Tabs.helpers.tsx';
import styles from './Tabs.hooks.module.css';

export function useList(list: ChildrenListComplete) {
  deprecate('The `useList` tabs hook is deprecated. Use `TabsView` instead.');

  const tabBarRef = useRef<HTMLDivElement>();
  const addonsRef = useRef<HTMLButtonElement>();
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const { width: tabBarWidth = 1 } = useResizeObserver<HTMLDivElement>({
    // @ts-expect-error (non strict)
    ref: tabBarRef,
  });

  const [visibleList, setVisibleList] = useState(list);
  const [invisibleList, setInvisibleList] = useState<ChildrenListComplete>([]);
  const previousList = useRef<ChildrenListComplete>(list);

  const AddonTab = useCallback(
    ({
      menuName,
      actions,
    }: {
      menuName: string;
      actions?: {
        onSelect: (id: string) => void;
      } & Record<string, any>;
    }) => {
      const isAddonsActive = invisibleList.some(({ active }) => active);
      const [isTooltipVisible, setTooltipVisible] = useState(false);
      return (
        <>
          <PopoverProvider
            ariaLabel="Additional tabs"
            visible={isTooltipVisible}
            onVisibleChange={setTooltipVisible}
            placement="bottom"
            popover={
              <TooltipLinkList
                links={invisibleList.map(({ title, id, color, active }) => {
                  return {
                    id,
                    title,
                    color,
                    active,
                    onClick: (e) => {
                      e.preventDefault();
                      // @ts-expect-error (non strict)
                      actions.onSelect(id);
                    },
                  } as Link;
                })}
              />
            }
          >
            <TabButton
              id="addons-menu-button"
              // @ts-expect-error (non strict)
              ref={addonsRef}
              active={isAddonsActive}
              data-pre-active={isTooltipVisible || undefined}
              style={{ visibility: invisibleList.length ? 'visible' : 'hidden' }}
              aria-hidden={!invisibleList.length}
              className={`tabbutton ${styles.addonButton}`}
              type="button"
              role="tab"
            >
              {menuName}
              <span
                className={`addon-collapsible-icon ${styles.collapseIcon}`}
                data-active={isAddonsActive || isTooltipVisible || undefined}
              />
            </TabButton>
          </PopoverProvider>
          {invisibleList.map(({ title, id, color }, index) => {
            const indexId = `index-${index}`;
            return (
              <TabButton
                id={`tabbutton-${sanitize(id) ?? indexId}`}
                style={{ visibility: 'hidden' }}
                aria-hidden
                tabIndex={-1}
                ref={(ref: HTMLButtonElement) => {
                  tabRefs.current.set(id, ref);
                }}
                className="tabbutton"
                type="button"
                key={id}
                textColor={color}
                role="tab"
              >
                {/* @ts-expect-error (we know this is broken) */}
                {title}
              </TabButton>
            );
          })}
        </>
      );
    },
    [invisibleList]
  );

  const setTabLists = useCallback(() => {
    // get x and width from tabBarRef div
    if (!tabBarRef.current || !addonsRef.current) {
      return;
    }
    const { x, width } = tabBarRef.current.getBoundingClientRect();
    const { width: widthAddonsTab } = addonsRef.current.getBoundingClientRect();
    const rightBorder = invisibleList.length ? x + width - widthAddonsTab : x + width;

    const newVisibleList: ChildrenListComplete = [];

    let widthSum = 0;

    const newInvisibleList = list.filter((item) => {
      const { id } = item;
      const tabButton = tabRefs.current.get(id);
      const { width: tabWidth = 0 } = tabButton?.getBoundingClientRect() || {};

      const crossBorder = x + widthSum + tabWidth > rightBorder;

      //  `!tabButton` happens when new tab has just been added
      if (!crossBorder || !tabButton) {
        newVisibleList.push(item);
      }

      widthSum += tabWidth;

      return crossBorder;
    });

    if (newVisibleList.length !== visibleList.length || previousList.current !== list) {
      setVisibleList(newVisibleList);
      setInvisibleList(newInvisibleList);
      previousList.current = list;
    }
  }, [invisibleList.length, list, visibleList]);

  useLayoutEffect(setTabLists, [setTabLists, tabBarWidth]);

  return {
    tabRefs,
    addonsRef,
    tabBarRef,
    visibleList,
    invisibleList,
    AddonTab,
  };
}
