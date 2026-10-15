import React from 'react';

import { clsx } from 'clsx';

import styles from './Radio.module.css';

export const Radio = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <input {...props} className={clsx(styles.radio, className)} type="radio" />;
};
