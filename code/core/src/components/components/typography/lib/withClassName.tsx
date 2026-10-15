import type { ComponentPropsWithoutRef, JSX } from 'react';
import { createElement, forwardRef } from 'react';

import { clsx } from 'clsx';

/** Makes a component that renders an HTML element with the given classes, plus its own `className`. */
export const withClassName = <T extends keyof JSX.IntrinsicElements>(
  tag: T,
  ...classNames: string[]
) => {
  const Component = forwardRef<any, ComponentPropsWithoutRef<T>>(({ className, ...props }, ref) =>
    createElement(tag, { ...props, ref, className: clsx(...classNames, className) })
  );
  Component.displayName = tag;
  return Component;
};
