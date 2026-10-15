import React, { type ComponentProps, type ElementType, forwardRef } from 'react';

import { clsx } from 'clsx';
import type { TransitionStatus } from 'react-transition-state';

import { Button } from '../Button/Button.tsx';
import { ToggleButton } from '../ToggleButton/ToggleButton.tsx';
import styles from './ActionList.module.css';

interface ActionListItemProps extends ComponentProps<'li'> {
  as?: ElementType;
  active?: boolean;
  transitionStatus?: TransitionStatus;
}

const ActionListItem = forwardRef<HTMLLIElement, ActionListItemProps>(function ActionListItem(
  { as: Comp = 'li', active, transitionStatus, className, ...props },
  ref
) {
  return (
    <Comp
      ref={ref}
      className={clsx(styles.item, className)}
      data-active={active || undefined}
      data-transition-status={transitionStatus}
      {...props}
    />
  );
});

/**
 * A ActionList item that shows/hides child elements on hover. Child elements must have a
 * `data-target-id` attribute matching the `targetId` prop to be affected by the hover behavior.
 */
const ActionListHoverItem = forwardRef<HTMLLIElement, ActionListItemProps & { targetId: string }>(
  function ActionListHoverItem({ targetId, className, ...props }, ref) {
    return <ActionListItem ref={ref} className={clsx(styles.hoverItem, className)} {...props} />;
  }
);

const ActionListButton = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(
  function ActionListButton(
    { padding = 'small', size = 'medium', variant = 'ghost', className, ...props },
    ref
  ) {
    return (
      <Button
        {...{ ...props, variant, padding, size, ref }}
        className={clsx(styles.button, className)}
      />
    );
  }
);

const ActionListToggle = forwardRef<HTMLButtonElement, ComponentProps<typeof ToggleButton>>(
  function ActionListToggle(
    { padding = 'small', size = 'medium', variant = 'ghost', ...props },
    ref
  ) {
    return <ToggleButton {...{ ...props, variant, padding, size, ref }} />;
  }
);

const ActionListAction = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(
  function ActionListAction({ className, ...props }, ref) {
    return <ActionListButton ref={ref} className={clsx(styles.action, className)} {...props} />;
  }
);

const ActionListLink = (
  props: ComponentProps<typeof ActionListAction> & React.AnchorHTMLAttributes<HTMLAnchorElement>
) => <ActionListAction as="a" {...(props as ComponentProps<typeof ActionListAction>)} />;

const ActionListText = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function ActionListText(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={clsx(styles.text, className)} {...props} />;
});

const ActionListIcon = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function ActionListIcon(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={clsx(styles.icon, className)} {...props} />;
});

const ActionListRoot = forwardRef<HTMLUListElement, ComponentProps<'ul'> & { as?: ElementType }>(
  function ActionList({ as: Comp = 'ul', className, ...props }, ref) {
    return (
      <Comp
        ref={ref}
        className={clsx(styles.list, className)}
        data-clickable={props.onClick ? true : undefined}
        {...props}
      />
    );
  }
);

export const ActionList = Object.assign(ActionListRoot, {
  Item: ActionListItem,
  HoverItem: ActionListHoverItem,
  Button: ActionListButton,
  Toggle: ActionListToggle,
  Action: ActionListAction,
  Link: ActionListLink,
  Text: ActionListText,
  Icon: ActionListIcon,
});
