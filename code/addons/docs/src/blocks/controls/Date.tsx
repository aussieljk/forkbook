import type { ChangeEvent, FC, RefObject } from 'react';
import React, { useEffect, useRef, useState } from 'react';

import { Form } from 'storybook/internal/components';

import { getControlId } from './helpers';
import type { ControlProps, DateConfig, DateValue } from './types';
import styles from './Date.module.css';

export const parseDate = (value: string) => {
  const [year, month, day] = value.split('-');
  const result = new Date();
  result.setFullYear(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  return result;
};

export const parseTime = (value: string) => {
  const [hours, minutes] = value.split(':');
  const result = new Date();
  result.setHours(parseInt(hours, 10));
  result.setMinutes(parseInt(minutes, 10));
  return result;
};

export const formatDate = (value: Date | number) => {
  const date = new Date(value);
  const year = `000${date.getFullYear()}`.slice(-4);
  const month = `0${date.getMonth() + 1}`.slice(-2);
  const day = `0${date.getDate()}`.slice(-2);
  return `${year}-${month}-${day}`;
};

export const formatTime = (value: Date | number) => {
  const date = new Date(value);
  const hours = `0${date.getHours()}`.slice(-2);
  const minutes = `0${date.getMinutes()}`.slice(-2);
  return `${hours}:${minutes}`;
};

export type DateProps = ControlProps<DateValue> & DateConfig;
export const DateControl: FC<DateProps> = ({
  name,
  storyId,
  controlsId,
  value,
  onChange,
  onFocus,
  onBlur,
  argType,
  required,
}) => {
  const [valid, setValid] = useState(true);
  const dateRef = useRef<HTMLInputElement>();
  const timeRef = useRef<HTMLInputElement>();
  const readonly = !!argType?.table?.readonly;

  useEffect(() => {
    if (valid !== false) {
      if (dateRef && dateRef.current) {
        dateRef.current.value = value ? formatDate(value) : '';
      }
      if (timeRef && timeRef.current) {
        timeRef.current.value = value ? formatTime(value) : '';
      }
    }
  }, [value]);

  const onDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      return onChange();
    }
    const parsed = parseDate(e.target.value);
    const result = new Date(value ?? '');
    result.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const time = result.getTime();

    if (time) {
      onChange(time);
    }
    setValid(!!time);
  };

  const onTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      return onChange();
    }
    const parsed = parseTime(e.target.value);
    const result = new Date(value ?? '');
    result.setHours(parsed.getHours());
    result.setMinutes(parsed.getMinutes());
    const time = result.getTime();

    if (time) {
      onChange(time);
    }
    setValid(!!time);
  };

  const controlId = getControlId(name, storyId, controlsId);

  return (
    <fieldset className={styles.fieldset}>
      <legend className="sb-sr-only">{name}</legend>
      <label htmlFor={`${controlId}-date`} className="sb-sr-only">
        Date
      </label>
      <Form.Input
        className={styles.input}
        type="date"
        max="9999-12-31" // I do this because of a rendering bug in chrome
        ref={dateRef as RefObject<HTMLInputElement>}
        id={`${controlId}-date`}
        name={`${controlId}-date`}
        readOnly={readonly}
        aria-required={required || undefined}
        onChange={onDateChange}
        {...{ onFocus, onBlur }}
      />
      <label htmlFor={`${controlId}-time`} className="sb-sr-only">
        Time
      </label>
      <Form.Input
        className={styles.input}
        type="time"
        id={`${controlId}-time`}
        name={`${controlId}-time`}
        ref={timeRef as RefObject<HTMLInputElement>}
        onChange={onTimeChange}
        readOnly={readonly}
        aria-required={required || undefined}
        {...{ onFocus, onBlur }}
      />
      {!valid ? <div>invalid</div> : null}
    </fieldset>
  );
};
