import type { ChangeEvent, FC } from 'react';
import React from 'react';

import { logger } from '@aussieljk/forkbook/internal/client-logger';

import { CaretDownIcon } from '@phosphor-icons/react';

import { getControlId } from '../helpers';
import type { ControlProps, NormalizedOptionsConfig, OptionsSelection } from '../types';
import { selectedKey, selectedKeys, selectedValues } from './helpers';
import styles from './Select.module.css';

type SelectConfig = NormalizedOptionsConfig & { isMulti: boolean };
type SelectProps = ControlProps<OptionsSelection> & SelectConfig;

const NO_SELECTION = 'Choose option...';

const SingleSelect: FC<SelectProps> = ({
  name,
  storyId,
  controlsId,
  value,
  options,
  onChange,
  argType,
  required,
}) => {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(options[e.currentTarget.value]);
  };
  const selection = selectedKey(value, options) || NO_SELECTION;
  const controlId = getControlId(name, storyId, controlsId);

  const readonly = !!argType?.table?.readonly;

  return (
    <span className={styles.wrapper}>
      <CaretDownIcon />
      <label htmlFor={controlId} className="fb-sr-only">
        {name}
      </label>
      <select
        className={styles.select}
        disabled={readonly}
        id={controlId}
        value={selection}
        onChange={handleChange}
        aria-required={required || undefined}
      >
        <option disabled={selection === NO_SELECTION} key="no-selection">
          {NO_SELECTION}
        </option>
        {Object.keys(options).map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </span>
  );
};

const MultiSelect: FC<SelectProps> = ({
  name,
  storyId,
  controlsId,
  value,
  options,
  onChange,
  argType,
  required,
}) => {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selection = Array.from(e.currentTarget.options)
      .filter((option) => option.selected)
      .map((option) => option.value);
    onChange(selectedValues(selection, options));
  };
  const selection = selectedKeys(value, options);
  const controlId = getControlId(name, storyId, controlsId);

  const readonly = !!argType?.table?.readonly;

  return (
    <span className={styles.wrapper}>
      <label htmlFor={controlId} className="fb-sr-only">
        {name}
      </label>
      <select
        className={styles.select}
        disabled={readonly}
        id={controlId}
        multiple
        value={selection}
        onChange={handleChange}
        aria-required={required || undefined}
      >
        {Object.keys(options).map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </span>
  );
};

export const SelectControl: FC<SelectProps> = (props) => {
  const { name, options } = props;
  if (!options) {
    logger.warn(`Select with no options: ${name}`);
    return <>-</>;
  }

  // oxlint-disable-next-line react-classic/destructuring-assignment
  return props.isMulti ? <MultiSelect {...props} /> : <SingleSelect {...props} />;
};
