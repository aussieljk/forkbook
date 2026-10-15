import React, { type ComponentProps, type ReactNode, type SyntheticEvent, forwardRef } from 'react';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';

import memoize from 'memoizerific';

import styles from './ListItem.module.css';

export interface TitleProps {
  children?: ReactNode;
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export interface RightProps {
  active?: boolean;
}

export interface CenterTextProps {
  active?: boolean;
  disabled?: boolean;
}

export interface LeftProps {
  active?: boolean;
}

export interface ItemProps {
  disabled?: boolean;
  href?: string;
  onClick?: (event: SyntheticEvent, ...args: any[]) => any;
}

const getItemProps = memoize(100)(({ onClick, input, href, LinkWrapper }) => ({
  ...(onClick && {
    as: 'button',
    role: 'button',
    onClick,
  }),
  ...(input && {
    as: 'label',
  }),
  ...(href && {
    as: 'a',
    role: 'link',
    href,
    ...(LinkWrapper && {
      as: LinkWrapper,
      to: href,
    }),
  }),
}));

export type LinkWrapperType = (props: any) => ReactNode;

export interface ListItemProps
  extends ItemProps, Omit<ComponentProps<'button'>, 'title' | 'onClick' | 'ref'> {
  loading?: boolean;
  title?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  icon?: ReactNode;
  input?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  href?: string;
  LinkWrapper?: LinkWrapperType;
  isIndented?: boolean;
}

const ListItem = forwardRef((props: ListItemProps, ref) => {
  const {
    loading = false,
    title = <span>Loading state</span>,
    center = null,
    right = null,
    active = false,
    disabled = false,
    isIndented = false,
    href = undefined,
    onClick = undefined,
    icon,
    input,
    LinkWrapper = undefined,
    ...rest
  } = props;
  const { as: Item = 'button', ...itemProps } = getItemProps(props);
  const left = icon || input;
  const activeAttr = active || undefined;
  const disabledAttr = disabled || undefined;

  deprecate('`ListItem` is deprecated and will be removed in Forkbook 11, use `MenuItem` instead.');

  return (
    <Item
      data-deprecated="ListItem"
      ref={ref}
      {...rest}
      disabled={disabled}
      className={styles.item}
      data-clickable={href || onClick ? true : undefined}
      data-disabled={disabledAttr}
      {...itemProps}
    >
      <>
        {left && (
          <span className={styles.left} data-active={activeAttr}>
            {left}
          </span>
        )}
        {title || center ? (
          <span className={styles.center} data-indented={(isIndented && !left) || undefined}>
            {title && (
              <span
                className={styles.title}
                data-active={activeAttr}
                data-loading={loading || undefined}
                data-disabled={disabledAttr}
              >
                {title}
              </span>
            )}
            {center && (
              <span
                className={styles.centerText}
                data-active={activeAttr}
                data-disabled={disabledAttr}
              >
                {center}
              </span>
            )}
          </span>
        ) : null}
        {right && <span className={styles.right}>{right}</span>}
      </>
    </Item>
  );
});
ListItem.displayName = 'ListItem';

export default ListItem;
