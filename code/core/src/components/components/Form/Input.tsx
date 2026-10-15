import React, { type HTMLProps } from 'react';
import { forwardRef, useId } from 'react';

import { clsx } from 'clsx';

import {
  type Alignments,
  type Sizes,
  type ValidationStates,
  controlClassName,
  sizeClassName,
} from './styles.ts';
import styles from './Input.module.css';

type InputProps = Omit<
  HTMLProps<HTMLInputElement>,
  keyof {
    size?: Sizes;
    align?: Alignments;
    valid?: ValidationStates;
    height?: number;
  }
> & {
  size?: Sizes;
  align?: Alignments;
  valid?: ValidationStates;
  height?: number;
  suffix?: string;
};

export const Input = forwardRef<any, InputProps>(function Input(
  { size, valid, align, value, suffix, className, ...props },
  ref
) {
  const suffixId = useId();
  return (
    <div className={styles.wrapper}>
      <input
        {...props}
        className={clsx(controlClassName, sizeClassName, styles.input, className)}
        data-size={size}
        data-align={align}
        data-valid={valid}
        value={value}
        ref={ref}
        aria-describedby={suffix ? suffixId : undefined}
      />
      {suffix && (
        <div className={styles.mask} aria-hidden>
          <span>{value}</span>
          <span id={suffixId}>{suffix}</span>
        </div>
      )}
    </div>
  );
});
Input.displayName = 'Input';
