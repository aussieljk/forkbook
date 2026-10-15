import type { ComponentProps } from 'react';
import React from 'react';

import { withReset } from '@aussieljk/forkbook/internal/components';

import { clsx } from 'clsx';

import styles from './Title.module.css';

export const Title = ({ className, ...props }: ComponentProps<'h1'>) => (
  <h1 className={clsx(withReset, styles.title, className)} {...props} />
);
