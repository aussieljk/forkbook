import type { FC } from 'react';
import React, { useCallback } from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';

import { getControlId, getControlSetterButtonId } from './helpers';
import type { BooleanConfig, BooleanValue, ControlProps } from './types';
import styles from './Boolean.module.css';

const parse = (value: string | null): boolean => value === 'true';

export type BooleanProps = ControlProps<BooleanValue> & BooleanConfig;
/**
 * # Boolean Control
 *
 * Renders a switch toggle with "True" or "False". or if the value is `undefined`, renders a button
 * to set the boolean.
 *
 * ## Example usage
 *
 * ```
 * <BooleanControl name="isTrue" value={value} onChange={handleValueChange} />;
 * ```
 */
export const BooleanControl: FC<BooleanProps> = ({
  name,
  storyId,
  controlsId,
  value,
  onChange,
  onBlur,
  onFocus,
  argType,
  required,
}) => {
  const onSetFalse = useCallback(() => onChange(false), [onChange]);
  const readonly = !!argType?.table?.readonly;
  if (value === undefined) {
    return (
      <Button
        ariaLabel={false}
        variant="outline"
        size="medium"
        id={getControlSetterButtonId(name, storyId, controlsId)}
        onClick={onSetFalse}
        disabled={readonly}
      >
        Set boolean
      </Button>
    );
  }
  const controlId = getControlId(name, storyId, controlsId);

  const parsedValue = typeof value === 'string' ? parse(value) : value;

  return (
    <label className={styles.label} aria-disabled={readonly} htmlFor={controlId} aria-label={name}>
      {/* oxlint-disable jsx-a11y/role-has-required-aria-props -- the native `checked` attribute provides the switch state */}
      <input
        id={controlId}
        type="checkbox"
        onChange={(e) => onChange(e.target.checked)}
        checked={parsedValue}
        role="switch"
        disabled={readonly}
        aria-required={required || undefined}
        {...{ name, onBlur, onFocus }}
      />
      {/* oxlint-enable jsx-a11y/role-has-required-aria-props */}
      <span aria-hidden="true">False</span>
      <span aria-hidden="true">True</span>
    </label>
  );
};
