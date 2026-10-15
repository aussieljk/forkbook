import type { ComponentProps } from 'react';
import React from 'react';

import { clsx } from 'clsx';

import styles from './NoResults.module.css';

export const NoResults = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={clsx(styles.noResults, className)} {...props} />
);
