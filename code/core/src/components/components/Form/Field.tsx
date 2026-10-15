import React, { type ComponentProps, type ReactNode } from 'react';

import { clsx } from 'clsx';

import styles from './Field.module.css';

export interface FieldProps extends Omit<ComponentProps<'label'>, 'children'> {
  children?: ReactNode;
  label?: ReactNode;
}

export const Field = ({ label, children, className, ...props }: FieldProps) => (
  <label className={clsx(styles.field, className)} {...props}>
    {label ? (
      <span className={styles.label}>
        <span>{label}</span>
      </span>
    ) : null}
    {children}
  </label>
);
