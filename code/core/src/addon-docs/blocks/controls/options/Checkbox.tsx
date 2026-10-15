import type { ChangeEvent, FC } from 'react';
import React, { useEffect, useState } from 'react';

import { logger } from 'storybook/internal/client-logger';

import { getControlId } from '../helpers';
import type { ControlProps, NormalizedOptionsConfig, OptionsMultiSelection } from '../types';
import { selectedKeys, selectedValues } from './helpers';
import styles from './Options.module.css';

type CheckboxConfig = NormalizedOptionsConfig & { isInline: boolean };
type CheckboxProps = ControlProps<OptionsMultiSelection> & CheckboxConfig;
export const CheckboxControl: FC<CheckboxProps> = ({
  name,
  storyId,
  controlsId,
  options,
  value,
  onChange,
  isInline,
  argType,
  required,
}) => {
  if (!options) {
    logger.warn(`Checkbox with no options: ${name}`);
    return <>-</>;
  }

  const initial = selectedKeys(value || [], options);
  const [selected, setSelected] = useState(initial);

  const readonly = !!argType?.table?.readonly;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const option = (e.target as HTMLInputElement).value;
    const updated = [...selected];
    if (updated.includes(option)) {
      updated.splice(updated.indexOf(option), 1);
    } else {
      updated.push(option);
    }
    onChange(selectedValues(updated, options));
    setSelected(updated);
  };

  useEffect(() => {
    setSelected(selectedKeys(value || [], options));
  }, [value]);

  const controlId = getControlId(name, storyId, controlsId);

  return (
    <fieldset className={styles.wrapper} data-inline={isInline || undefined}>
      <legend className="sb-sr-only">
        {name}
        {required ? ' (required)' : ''}
      </legend>
      {Object.keys(options).map((key, index) => {
        const id = `${controlId}-${index}`;
        return (
          <label
            key={id}
            className={styles.label}
            htmlFor={id}
            data-readonly={readonly || undefined}
          >
            <input
              type="checkbox"
              disabled={readonly}
              id={id}
              name={id}
              value={key}
              onChange={handleChange}
              checked={selected?.includes(key)}
            />
            <span className={styles.text}>{key}</span>
          </label>
        );
      })}
    </fieldset>
  );
};
