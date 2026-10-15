import React from 'react';

import { clsx } from 'clsx';

import styles from './Checkbox.module.css';

export const Checkbox = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <input {...props} className={clsx(styles.checkbox, className)} type="checkbox" />;
};
