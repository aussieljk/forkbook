import type { HTMLAttributes, ReactNode, SyntheticEvent } from 'react';
import React, { Fragment, useCallback } from 'react';

import { deprecate } from 'storybook/internal/client-logger';

import type { LinkWrapperType, ListItemProps } from './ListItem.tsx';
import ListItem from './ListItem.tsx';
import styles from './TooltipLinkList.module.css';

export interface NormalLink extends Omit<ListItemProps, 'onClick'> {
  id: string;
  onClick?: (
    event: SyntheticEvent,
    item: Pick<ListItemProps, 'id' | 'active' | 'disabled' | 'title' | 'href'>
  ) => void;
}

export type Link = CustomLink | NormalLink;

/**
 * This is a custom link that can be used in the `TooltipLinkList` component. It allows for custom
 * content to be rendered in the list; it does not have to be a link.
 */
interface CustomLink {
  id: string;
  content: ReactNode;
}

interface ItemProps extends NormalLink {
  isIndented?: boolean;
}

const Item = ({ id, onClick, ...rest }: ItemProps) => {
  const { active, disabled, title, href } = rest;

  const handleClick = useCallback(
    (event: SyntheticEvent) => onClick?.(event, { id, active, disabled, title, href }),
    [onClick, id, active, disabled, title, href]
  );

  return <ListItem id={`list-item-${id}`} {...rest} {...(onClick && { onClick: handleClick })} />;
};

export interface TooltipLinkListProps extends HTMLAttributes<HTMLDivElement> {
  links: Link[] | Link[][];
  LinkWrapper?: LinkWrapperType;
}

export const TooltipLinkList = ({ links, LinkWrapper, ...props }: TooltipLinkListProps) => {
  deprecate(
    '`TooltipLinkList` is deprecated and will be removed in Storybook 11, use `ActionList` or `MenuItem` and `WithMenu` instead.'
  );

  const groups = Array.isArray(links[0]) ? (links as Link[][]) : [links as Link[]];
  const isIndented = groups.some((group) =>
    group.some((link) => ('icon' in link && link.icon) || ('input' in link && link.input))
  );
  return (
    <div data-deprecated="TooltipLinkList" {...props} className={`sb-list ${styles.list}`}>
      {groups
        .filter((group) => group.length)
        .map((group, index) => {
          return (
            <div className={styles.group} key={group.map((link) => link.id).join(`~${index}~`)}>
              {group.map((link) => {
                if ('content' in link) {
                  return <Fragment key={link.id}>{link.content}</Fragment>;
                }
                return (
                  <Item key={link.id} isIndented={isIndented} LinkWrapper={LinkWrapper} {...link} />
                );
              })}
            </div>
          );
        })}
    </div>
  );
};
