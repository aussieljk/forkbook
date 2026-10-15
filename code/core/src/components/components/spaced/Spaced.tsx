import type { CSSProperties } from 'react';
import React from 'react';

import { clsx } from 'clsx';

import styles from './Spaced.module.css';

const toNumber = (input: any) => (typeof input === 'number' ? input : Number(input));

export interface SpacedProps {
  children?: React.ReactNode;
  col?: number;
  row?: number;
  outer?: number | boolean;
  className?: string;
}

export const Spaced = ({ col, row, outer, children, className, ...rest }: SpacedProps) => {
  const outerAmount = toNumber(typeof outer === 'number' || !outer ? outer : col || row);

  return (
    <div
      className={clsx(
        col ? styles.col : styles.row,
        outerAmount && col ? styles.outerCol : outerAmount && row ? styles.outerRow : undefined,
        className
      )}
      style={
        {
          '--spaced-col': col,
          '--spaced-row': row ?? 1,
          '--spaced-outer': outerAmount,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </div>
  );
};
