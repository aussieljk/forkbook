import type { ComponentProps, CSSProperties, FC } from 'react';
import React, { Fragment } from 'react';

import { clsx } from 'clsx';

import styles from './Loader.module.css';

const LOADER_SEQUENCE = [0, 0, 1, 1, 2, 3, 3, 3, 1, 1, 1, 2, 2, 2, 3];

export const Contained = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={clsx(styles.contained, className)} {...props} />
);

interface LoaderProps {
  /**
   * The number of lines to display in the loader. These are indented according to a pre-defined
   * sequence of depths.
   */
  size: number;
}

export const Loader: FC<LoaderProps> = ({ size }) => {
  const repeats = Math.ceil(size / LOADER_SEQUENCE.length);
  // Creates an array that repeats LOADER_SEQUENCE depths in order, until the size is reached.
  const sequence = Array.from(Array(repeats)).fill(LOADER_SEQUENCE).flat().slice(0, size);
  return (
    <Fragment>
      {sequence.map((depth, index) => (
        <div
          className={styles.loadingItem}
          style={{ '--sb-depth': depth } as CSSProperties}
          key={index}
        />
      ))}
    </Fragment>
  );
};
