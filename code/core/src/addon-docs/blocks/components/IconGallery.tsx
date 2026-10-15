import type { FunctionComponent } from 'react';
import React from 'react';

import { ResetWrapper } from '@aussieljk/forkbook/internal/components';

import { clsx } from 'clsx';

import { blockBackground } from './BlockBackgroundStyles';
import styles from './IconGallery.module.css';

interface IconItemProps {
  name: string;
  children?: React.ReactNode;
}

/** An individual icon with a caption and an example (passed as `children`). */
export const IconItem: FunctionComponent<IconItemProps> = ({ name, children }) => (
  <div className={styles.item}>
    <div className={clsx(blockBackground, styles.itemSpecimen)}>{children}</div>
    <div className={styles.itemLabel}>{name}</div>
  </div>
);

interface IconGalleryProps {
  children?: React.ReactNode;
}

/** Show a grid of icons, as specified by `IconItem`. */
export const IconGallery: FunctionComponent<IconGalleryProps> = ({ children, ...props }) => (
  <ResetWrapper>
    <div {...props} className={clsx(styles.list, 'docblock-icongallery sb-unstyled')}>
      {children}
    </div>
  </ResetWrapper>
);
