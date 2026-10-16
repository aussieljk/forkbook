import type { FC } from 'react';
import React from 'react';

import { withReset } from '@aussieljk/forkbook/internal/components';

import { clsx } from 'clsx';

import { blockBackground } from './BlockBackgroundStyles';
import styles from './Typeset.module.css';

export interface TypesetProps {
  fontFamily?: string;
  fontSizes: (string | number)[];
  fontWeight?: number;
  sampleText?: string;
}

/**
 * Convenient styleguide documentation showing examples of type with different sizes and weights and
 * configurable sample text.
 */
export const Typeset: FC<TypesetProps> = ({
  fontFamily,
  fontSizes,
  fontWeight,
  sampleText,
  ...props
}) => (
  <div
    {...props}
    className={clsx(withReset, blockBackground, styles.wrapper, 'docblock-typeset fb-unstyled')}
  >
    {fontSizes.map((size) => (
      <div key={size} className={styles.typeSpecimen}>
        <div className={styles.label}>{size}</div>
        <div
          className={styles.sample}
          style={{
            fontFamily,
            fontSize: size,
            fontWeight,
            lineHeight: 1.2,
          }}
        >
          {sampleText || 'Was he a beast if music could move him so?'}
        </div>
      </div>
    ))}
  </div>
);
