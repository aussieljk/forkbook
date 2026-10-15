import type { ComponentProps } from 'react';
import React, { forwardRef } from 'react';

import { clsx } from 'clsx';

import styles from './helpers.module.css';

export const PAGE_STEP_SIZE = 5;
export const UNDEFINED_VALUE = Symbol.for('undefined');

export type Value = string | number | null | boolean | undefined;
export type InternalValue = string | number | null | boolean | typeof UNDEFINED_VALUE;

export interface Option {
  /** Optional rendering of the option. */
  children?: React.ReactNode;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  aside?: React.ReactNode;
  value: Value;
}
export interface InternalOption extends Omit<Option, 'value'> {
  type: 'option';
  value: InternalValue;
}
export interface ResetOption extends Omit<Option, 'value'> {
  type: 'reset';
  value: undefined;
}

export function isLiteralValue(value: Value | Value[] | undefined): value is Value {
  return (
    value === undefined ||
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'symbol'
  );
}

export function optionToInternal(option: Option): InternalOption {
  return {
    ...option,
    type: 'option',
    value: externalToValue(option.value),
  };
}

export function optionOrResetToInternal(
  option: Option | ResetOption
): InternalOption | ResetOption {
  if ('type' in option && option.type === 'reset') {
    return option;
  }
  return optionToInternal(option);
}

export function valueToExternal(value: InternalValue): Value {
  if (value === UNDEFINED_VALUE) {
    return undefined;
  }
  return value;
}

export function externalToValue(value: Value): InternalValue {
  if (value === undefined) {
    return UNDEFINED_VALUE;
  }
  return value;
}

export const Listbox = forwardRef<HTMLUListElement, ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={clsx(styles.listbox, className)} {...props} />
  )
);
Listbox.displayName = 'Listbox';
