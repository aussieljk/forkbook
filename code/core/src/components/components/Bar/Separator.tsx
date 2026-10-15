import type { ComponentProps } from 'react';
import React, { Fragment } from 'react';

import { clsx } from 'clsx';

import styles from './Separator.module.css';

export interface SeparatorProps extends ComponentProps<'span'> {
  force?: boolean;
}

export const Separator = ({ force, className, ...props }: SeparatorProps) => (
  <span className={clsx(styles.separator, className)} data-force={force || undefined} {...props} />
);
Separator.displayName = 'Separator';

export const interleaveSeparators = (list: any[]) =>
  list.reduce(
    (acc, item, index) =>
      item ? (
        <Fragment key={item.id || item.key || `f-${index}`}>
          {acc}
          {}
          {index > 0 ? <Separator key={`s-${index}`} /> : null}
          {item.render() || item}
        </Fragment>
      ) : (
        acc
      ),
    null
  );
