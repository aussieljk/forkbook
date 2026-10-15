import type {
  CSSProperties,
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  ForwardRefExoticComponent,
  ForwardedRef,
  ReactElement,
  ReactNode,
  RefAttributes,
} from 'react';
import React, { forwardRef } from 'react';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';

import { clsx } from 'clsx';

import styles from './Button.module.css';

interface ButtonProps extends DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> {
  href?: never;
  target?: never;
}
interface LinkProps extends DetailedHTMLProps<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
> {
  disabled?: void;
  href: string;
}

const isLink = (obj: {
  props: ButtonProps | LinkProps;
  ref: ForwardedRef<HTMLButtonElement> | ForwardedRef<HTMLAnchorElement>;
}): obj is { props: LinkProps; ref: ForwardedRef<HTMLAnchorElement> } => {
  return typeof obj.props.href === 'string';
};

const isButton = (obj: {
  props: ButtonProps | LinkProps;
  ref: ForwardedRef<HTMLButtonElement> | ForwardedRef<HTMLAnchorElement>;
}): obj is { props: ButtonProps; ref: ForwardedRef<HTMLButtonElement> } => {
  return typeof obj.props.href !== 'string';
};

function ForwardRefFunction(p: LinkProps, r: ForwardedRef<HTMLAnchorElement>): ReactElement;
function ForwardRefFunction(p: ButtonProps, r: ForwardedRef<HTMLButtonElement>): ReactElement;
function ForwardRefFunction(
  { children, ...rest }: ButtonProps | LinkProps,
  ref: ForwardedRef<HTMLButtonElement> | ForwardedRef<HTMLAnchorElement>
) {
  const o = { props: rest, ref };
  if (isLink(o)) {
    return (
      <a ref={o.ref} {...o.props}>
        {children}
      </a>
    );
  }
  if (isButton(o)) {
    return (
      <button ref={o.ref} type="button" {...o.props}>
        {children}
      </button>
    );
  }
  throw new Error('invalid props');
}
type ButtonLike<P = {}> = ForwardRefExoticComponent<
  Omit<ButtonProps, 'ref'> & RefAttributes<HTMLButtonElement> & P
>;

type LinkLike<P = {}> = ForwardRefExoticComponent<
  Omit<LinkProps, 'ref'> & RefAttributes<HTMLAnchorElement> & P
>;

const ButtonOrLink: ButtonLike | LinkLike = forwardRef(ForwardRefFunction);

ButtonOrLink.displayName = 'ButtonOrLink';

export interface TabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
  id?: string;
  textColor?: string;
}

export const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(
  ({ active, textColor, className, style, ...props }, ref) => {
    deprecate('The `TabButton` component is deprecated. Use `TabList` instead.');
    return (
      <ButtonOrLink
        data-deprecated="TabButton"
        ref={ref}
        className={clsx(styles.tabButton, className)}
        data-active={active || undefined}
        style={
          textColor ? ({ '--sb-tab-text-color': textColor, ...style } as CSSProperties) : style
        }
        {...props}
      />
    );
  }
);
TabButton.displayName = 'TabButton';
