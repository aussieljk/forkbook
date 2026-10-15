import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Form } from 'storybook/internal/components';

import { clsx } from 'clsx';

import styles from './NumericInput.module.css';

interface NumericInputProps extends Omit<ComponentProps<typeof Form.Input>, 'value'> {
  label?: string;
  before?: ReactNode;
  after?: ReactNode;
  value: string;
  setValue: (value: string) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  unit?: string;
  baseUnit?: string;
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput(
  {
    label,
    before,
    after,
    value,
    setValue,
    minValue = -Infinity,
    maxValue = Infinity,
    step = 1,
    unit: fixedUnit,
    baseUnit = fixedUnit,
    className,
    style,
    ...props
  },
  forwardedRef
) {
  const baseUnitRegex = useMemo(() => baseUnit && new RegExp(`${baseUnit}$`), [baseUnit]);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    baseUnitRegex ? value.replace(baseUnitRegex, '') : value
  );
  const id = props.id || inputId;

  useImperativeHandle(forwardedRef, () => inputRef.current!);

  const parseValue = useCallback(
    (value: string) => {
      const [, inputValue, unit = fixedUnit || baseUnit || ''] =
        value.match(/(-?\d+(?:\.\d+)?)(\%|[a-z]{1,4})?$/) || [];
      const number = Math.max(minValue, Math.min(parseFloat(inputValue), maxValue));
      return { number, unit };
    },
    [minValue, maxValue, fixedUnit, baseUnit]
  );

  const updateValue = useCallback(
    (value: string) => {
      const { number, unit } = parseValue(value);
      if (Number.isNaN(number)) {
        setInputValue(value);
      } else {
        setInputValue(`${number}${unit === baseUnit ? '' : unit}`);
        setValue(`${number}${unit}`);
      }
    },
    [parseValue, setValue, baseUnit]
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => updateValue(e.target.value),
    [updateValue]
  );

  const setInputSelection = useCallback(() => {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      const index = input?.value.search(/[^-\d.]/) ?? -1;
      if (input && index >= 0) {
        input.setSelectionRange(index, index);
      }
    });
  }, []);

  const updateInputValue = useCallback(
    () => setInputValue(baseUnitRegex ? value.replace(baseUnitRegex, '') : value),
    [value, baseUnitRegex]
  );

  useEffect(() => {
    if (inputRef.current !== document.activeElement) {
      updateInputValue();
    }
  }, [updateInputValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        return;
      }
      e.preventDefault();

      const { number, unit } = parseValue(inputValue);
      if (!Number.isNaN(number)) {
        const delta = e.shiftKey ? step * 10 : step;
        updateValue(`${e.key === 'ArrowUp' ? number + delta : number - delta}${unit}`);
        setInputSelection();
      }
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('keydown', handleKeyDown);
      return () => input.removeEventListener('keydown', handleKeyDown);
    }
  }, [inputValue, parseValue, setInputSelection, step, updateValue]);

  return (
    <div
      className={clsx(styles.wrapper, className)}
      data-after={after ? true : undefined}
      data-before={before ? true : undefined}
      style={style}
    >
      {before && <div>{before}</div>}
      {label && (
        <label htmlFor={id} className="sb-sr-only">
          {label}
        </label>
      )}
      <Form.Input
        {...props}
        id={id}
        ref={inputRef}
        value={inputValue}
        suffix={fixedUnit ? fixedUnit : inputValue && baseUnit}
        onChange={onChange}
        onFocus={setInputSelection}
        onBlur={updateInputValue}
      />
      {after && <div>{after}</div>}
    </div>
  );
});
