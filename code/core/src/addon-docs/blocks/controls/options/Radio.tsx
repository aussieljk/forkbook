import type { FC } from 'react';
import React from 'react';

import { logger } from '@aussieljk/forkbook/internal/client-logger';

import { getControlId } from '../helpers';
import type { ControlProps, NormalizedOptionsConfig, OptionsSingleSelection } from '../types';
import { selectedKey } from './helpers';
import styles from './Options.module.css';

type RadioConfig = NormalizedOptionsConfig & { isInline: boolean };
type RadioProps = ControlProps<OptionsSingleSelection> & RadioConfig;
export const RadioControl: FC<RadioProps> = ({
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
    logger.warn(`Radio with no options: ${name}`);
    return <>-</>;
  }
  const selection = selectedKey(value, options);
  const controlId = getControlId(name, storyId, controlsId);

  const readonly = !!argType?.table?.readonly;

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
              type="radio"
              id={id}
              name={controlId}
              disabled={readonly}
              value={key}
              onChange={(e) => onChange(options[e.currentTarget.value])}
              checked={key === selection}
            />
            <span className={styles.text}>{key}</span>
          </label>
        );
      })}
    </fieldset>
  );
};
