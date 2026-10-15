import type { FC, KeyboardEvent } from 'react';
import React from 'react';

import { Bar, type BarProps } from '../Bar/Bar.tsx';

export interface AbstractToolbarProps {
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  lang?: string;
}

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Moves focus between the items of a horizontal toolbar with the arrow, Home and End keys. */
const onToolbarKeyDown = (event: KeyboardEvent<HTMLElement>) => {
  const target = event.target as HTMLElement;
  if (
    event.defaultPrevented ||
    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) ||
    target.matches('input, select, textarea, [contenteditable="true"]')
  ) {
    return;
  }

  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (item) => item.getClientRects().length > 0
  );
  const index = items.findIndex((item) => item === target || item.contains(target));
  if (index === -1) {
    return;
  }

  const next = {
    ArrowLeft: Math.max(index - 1, 0),
    ArrowRight: Math.min(index + 1, items.length - 1),
    Home: 0,
    End: items.length - 1,
  }[event.key as 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'];

  event.preventDefault();
  event.stopPropagation();
  items[next].focus();
};

const toolbarProps = {
  role: 'toolbar',
  'aria-orientation': 'horizontal',
  onKeyDown: onToolbarKeyDown,
} as const;

export const AbstractToolbar: FC<AbstractToolbarProps> = (props) => (
  <div {...toolbarProps} {...props} />
);

export interface ToolbarProps extends AbstractToolbarProps, BarProps {}

export const Toolbar: FC<ToolbarProps> = (props) => <Bar {...toolbarProps} {...props} />;
