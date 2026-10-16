import type { CSSProperties, ChangeEvent, FC } from 'react';
import React, { useMemo } from 'react';

import { clsx } from 'clsx';

import { parse } from './Number';
import { getControlId } from './helpers';
import type { ControlProps, NumberValue, RangeConfig } from './types';
import styles from './Range.module.css';

type RangeProps = ControlProps<NumberValue | null> & RangeConfig;

function getNumberOfDecimalPlaces(number: number) {
  const match = number.toString().match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  return !match
    ? 0
    : Math.max(
        0,
        // Number of digits right of decimal point.
        (match[1] ? match[1].length : 0) -
          // Adjust for scientific notation.
          (match[2] ? +match[2] : 0)
      );
}

export const RangeControl: FC<RangeProps> = ({
  name,
  storyId,
  controlsId,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  onBlur,
  onFocus,
  argType,
  required,
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(parse(event.target.value));
  };

  const hasValue = value !== undefined;
  const numberOFDecimalsPlaces = useMemo(() => getNumberOfDecimalPlaces(step), [step]);

  const readonly = !!argType?.table?.readonly;
  const controlId = getControlId(name, storyId, controlsId);

  const current = value ?? min;

  return (
    <div className={styles.wrapper} data-readonly={readonly || undefined}>
      <label htmlFor={controlId} className="fb-sr-only">
        {name}
      </label>
      <span className={styles.label}>{min}</span>
      <input
        className={styles.input}
        style={
          { '--fb-range-progress': `${((current - min) / (max - min)) * 100}%` } as CSSProperties
        }
        id={controlId}
        type="range"
        disabled={readonly}
        onChange={handleChange}
        aria-required={required || undefined}
        {...{ name, min, max, step, onFocus, onBlur }}
        value={current}
      />
      <span
        className={clsx(styles.label, styles.currentAndMax)}
        // Fixed width of "current / max" label to avoid slider width changes
        // 3 = size of separator " / "
        style={{ width: `${numberOFDecimalsPlaces + max.toString().length * 2 + 3}ch` }}
      >
        {hasValue ? value!.toFixed(numberOFDecimalsPlaces) : '--'} / {max}
      </span>
    </div>
  );
};
