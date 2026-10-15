import type { ComponentProps } from 'react';
import React from 'react';

import { clsx } from 'clsx';

import { withReset } from '../lib/common.tsx';
import { Link } from './Link.tsx';
import styles from './A.module.css';

export const A = ({ className, ...props }: ComponentProps<typeof Link>) => (
  <Link className={clsx(withReset, styles.a, className)} {...props} />
);
