import type { ChangeEvent, FC } from 'react';
import React, { useCallback, useState } from 'react';

import { Button, Form } from '@aussieljk/forkbook/internal/components';

import { getControlId, getControlSetterButtonId } from './helpers';
import type { ControlProps, TextConfig, TextValue } from './types';
import styles from './Text.module.css';

export type TextProps = ControlProps<TextValue | undefined> & TextConfig;

export const TextControl: FC<TextProps> = ({
  name,
  storyId,
  controlsId,
  value,
  onChange,
  onFocus,
  onBlur,
  maxLength,
  argType,
  required,
}) => {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const readonly = !!argType?.table?.readonly;

  const [forceVisible, setForceVisible] = useState(false);

  const onForceVisible = useCallback(() => {
    onChange('');
    setForceVisible(true);
  }, [setForceVisible]);

  if (value === undefined) {
    return (
      <Button
        ariaLabel={false}
        variant="outline"
        size="medium"
        disabled={readonly}
        id={getControlSetterButtonId(name, storyId, controlsId)}
        onClick={onForceVisible}
      >
        Set string
      </Button>
    );
  }

  const isValid = typeof value === 'string';

  return (
    <label className={styles.wrapper}>
      <Form.Textarea
        id={getControlId(name, storyId, controlsId)}
        maxLength={maxLength}
        onChange={handleChange}
        disabled={readonly}
        size="flex"
        placeholder="Edit string..."
        autoFocus={forceVisible}
        aria-required={required || undefined}
        valid={isValid ? undefined : 'error'}
        {...{ name, value: isValid ? value : '', onFocus, onBlur }}
      />
      {maxLength && (
        <div className={styles.maxLength} data-maxed={value?.length === maxLength || undefined}>
          {value?.length ?? 0} / {maxLength}
        </div>
      )}
    </label>
  );
};
