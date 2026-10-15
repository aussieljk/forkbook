import type { ComponentProps, FC } from 'react';
import React from 'react';

import { clsx } from 'clsx';

import styles from './CollapseIcon.module.css';

export const CollapseIcon: FC<ComponentProps<'div'> & { isExpanded: boolean }> = ({
  isExpanded,
  className,
  ...props
}) => (
  <div
    className={clsx(styles.collapseIcon, className)}
    data-expanded={isExpanded || undefined}
    {...props}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.896 7.146a.5.5 0 1 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 1 0-.708.708L5.043 4 1.896 7.146Z"
      />
    </svg>
  </div>
);
