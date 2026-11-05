import type { FC } from 'react';
import React from 'react';

import type { ControlProps, Options, OptionsConfig, OptionsSelection } from '../types.ts';
import { CheckboxControl } from './Checkbox.tsx';
import { RadioControl } from './Radio.tsx';
import { SelectControl } from './Select.tsx';

/**
 * Options can accept `options` in two formats:
 *
 * - Array: ['a', 'b', 'c'] OR
 * - Object: { a: 1, b: 2, c: 3 } (deprecated)
 *
 * We always normalize to the more generalized object format and ONLY handle the object format in
 * the underlying control implementations.
 *
 * While non-primitive values are deprecated, they might still not be valid object keys, so the
 * resulting object is a Label -> Value mapping.
 */
export const normalizeOptions = (options?: Options, labels?: OptionsConfig['labels']) => {
  if (Array.isArray(options)) {
    return options.reduce<Record<string, unknown>>((acc, item) => {
      // Guard against `labels` being an array (e.g. from Svelte docgen), prototype-chain
      // lookups, and keys present with an undefined value (partial label maps).
      // Checking `typeof === 'string'` covers all three: arrays are skipped by the
      // isArray guard, prototype-chain values are functions (not strings), and an
      // explicitly-undefined label value is also not a string.
      const mapped = labels != null && !Array.isArray(labels) ? labels[String(item)] : undefined;
      const label = typeof mapped === 'string' ? mapped : String(item);
      acc[label] = item;
      return acc;
    }, {});
  }
  return options;
};

const Controls = {
  check: CheckboxControl,
  'inline-check': CheckboxControl,
  radio: RadioControl,
  'inline-radio': RadioControl,
  select: SelectControl,
  'multi-select': SelectControl,
} as const;

export type OptionsProps = ControlProps<OptionsSelection> & OptionsConfig;
export const OptionsControl: FC<OptionsProps> = (props) => {
  const { type = 'select', labels, argType } = props;
  const normalized = {
    ...props,
    argType,
    options: argType ? normalizeOptions(argType.options, labels) : {},
    isInline: type.includes('inline'),
    isMulti: type.includes('multi'),
  };

  // Each control reads the value in the shape its type gives (one value or an array).
  const Control = Controls[type] as FC<typeof normalized> | undefined;

  if (Control) {
    return <Control {...normalized} />;
  }

  throw new Error(`Unknown options type: ${type}`);
};
