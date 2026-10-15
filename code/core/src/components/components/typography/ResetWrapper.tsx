import type { ComponentProps } from 'react';
import React, { forwardRef } from 'react';

import { clsx } from 'clsx';

import { withReset } from './lib/common.tsx';

/**
 * This is a "local" reset to style subtrees with Forkbook styles
 *
 * We can't style individual elements (e.g. h1, h2, etc.) in here because the CSS specificity is too
 * high, so those styles can too easily override child elements that are not expecting it.
 */
export const ResetWrapper = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(withReset, className)} {...props} />
  )
);
ResetWrapper.displayName = 'ResetWrapper';
