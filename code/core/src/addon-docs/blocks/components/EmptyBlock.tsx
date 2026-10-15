import type { FC } from 'react';
import React from 'react';

import { withReset } from 'storybook/internal/components';

import { clsx } from 'clsx';

import styles from './EmptyBlock.module.css';

export const EmptyBlock: FC<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>
> = (props) => (
  <div {...props} className={clsx(withReset, styles.wrapper, 'docblock-emptyblock sb-unstyled')} />
);
