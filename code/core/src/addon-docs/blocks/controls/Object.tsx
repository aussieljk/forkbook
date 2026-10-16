import type { ComponentProps, FC, FocusEvent, SyntheticEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Form, ToggleButton } from '@aussieljk/forkbook/internal/components';

import { MinusIcon, PencilSimpleIcon, PlusIcon } from '@phosphor-icons/react';

import { clsx } from 'clsx';
import { cloneDeep } from 'es-toolkit/object';

import { getControlId, getControlSetterButtonId } from './helpers';
import { JsonTree } from './react-editable-json-tree';
import type { ControlProps, ObjectConfig, ObjectValue } from './types';
import styles from './Object.module.css';

const { window: globalWindow } = globalThis;

// The JSON tree clones this element with a `rejt-plus-menu` or `rejt-minus-menu` class.
const ActionButton = ({ className, ...props }: ComponentProps<'button'>) => (
  <button className={clsx(styles.actionButton, className)} {...props} />
);

const ENTER_EVENT = {
  bubbles: true,
  cancelable: true,
  key: 'Enter',
  code: 'Enter',
  keyCode: 13,
};
const dispatchEnterKey = (event: SyntheticEvent<HTMLInputElement>) => {
  event.currentTarget.dispatchEvent(new globalWindow.KeyboardEvent('keydown', ENTER_EVENT));
};
const selectValue = (event: SyntheticEvent<HTMLInputElement>) => {
  event.currentTarget.select();
};

export type ObjectProps = ControlProps<ObjectValue> & ObjectConfig;

export const ObjectControl: FC<ObjectProps> = ({
  name,
  storyId,
  controlsId,
  value,
  onChange,
  argType,
  required,
}) => {
  const data = useMemo(() => value && cloneDeep(value), [value]);
  const hasData = data !== null && data !== undefined;
  const [showRaw, setShowRaw] = useState(!hasData);
  const hadDataRef = useRef(hasData);

  const [parseError, setParseError] = useState<Error | null>(null);
  const readonly = !!argType?.table?.readonly;
  const updateRaw: (raw: string) => void = useCallback(
    (raw) => {
      try {
        if (raw) {
          onChange(JSON.parse(raw));
        }
        setParseError(null);
      } catch (e) {
        setParseError(e as Error);
      }
    },
    [onChange]
  );

  const [forceVisible, setForceVisible] = useState(false);
  const onForceVisible = useCallback(() => {
    onChange({});
    setForceVisible(true);
  }, [onChange, setForceVisible]);

  useEffect(() => {
    if (!hadDataRef.current && hasData && showRaw && !forceVisible) {
      setShowRaw(false);
    }
    hadDataRef.current = hasData;
  }, [forceVisible, hasData, showRaw]);

  const htmlElRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (forceVisible && htmlElRef.current) {
      htmlElRef.current.select();
    }
  }, [forceVisible]);

  // Use string value as key to force re-render on Arg value reset.
  const jsonString = useMemo(() => {
    return JSON.stringify(data ?? '', null, 2);
  }, [data]);

  if (!hasData) {
    return (
      <Button
        ariaLabel={false}
        disabled={readonly}
        id={getControlSetterButtonId(name, storyId, controlsId)}
        onClick={onForceVisible}
      >
        Set object
      </Button>
    );
  }

  const rawInputId = getControlId(name, storyId, controlsId);
  const rawJSONForm = (
    <>
      <label htmlFor={rawInputId} className="fb-sr-only">
        Edit {name} as JSON
      </label>
      <Form.Textarea
        className={styles.rawInput}
        ref={htmlElRef}
        id={rawInputId}
        minRows={3}
        name={name}
        key={jsonString}
        defaultValue={jsonString}
        onBlur={(event: FocusEvent<HTMLTextAreaElement>) => updateRaw(event.target.value)}
        placeholder="Edit JSON string..."
        autoFocus={forceVisible}
        valid={parseError ? 'error' : undefined}
        readOnly={readonly}
        aria-required={required || undefined}
      />
    </>
  );

  const isObjectOrArray =
    Array.isArray(value) || (typeof value === 'object' && value?.constructor === Object);

  return (
    <div className={styles.wrapper}>
      {isObjectOrArray && (
        <ToggleButton
          className={styles.rawButton}
          disabled={readonly}
          pressed={showRaw}
          ariaLabel={`Edit ${name} as JSON`}
          onClick={(e: SyntheticEvent) => {
            e.preventDefault();
            setShowRaw((isRaw) => !isRaw);
          }}
          variant="ghost"
          padding="small"
          size="small"
        >
          <PencilSimpleIcon />
        </ToggleButton>
      )}
      {!showRaw ? (
        <JsonTree
          readOnly={readonly || !isObjectOrArray}
          isCollapsed={isObjectOrArray ? /* default value */ undefined : () => true}
          data={data}
          rootName={name}
          onFullyUpdate={onChange}
          cancelButtonElement={
            <button className={styles.buttonInline} type="button">
              Cancel
            </button>
          }
          addButtonElement={
            <button className={styles.buttonInline} type="submit" data-primary>
              Save
            </button>
          }
          plusMenuElement={
            <ActionButton type="button">
              <PlusIcon />
            </ActionButton>
          }
          minusMenuElement={
            <ActionButton type="button">
              <MinusIcon />
            </ActionButton>
          }
          inputElement={(_: unknown, __: unknown, ___: unknown, key: string) =>
            key ? (
              <input className={styles.input} onFocus={selectValue} onBlur={dispatchEnterKey} />
            ) : (
              <input className={styles.input} />
            )
          }
          fallback={rawJSONForm}
        />
      ) : (
        rawJSONForm
      )}
    </div>
  );
};
