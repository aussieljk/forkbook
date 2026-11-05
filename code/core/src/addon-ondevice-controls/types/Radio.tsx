import React from 'react';
import RadioSelect, { type RadioItem } from '../components/RadioSelect.tsx';
import type { ControlTypes } from '../sharedTypes.ts';

export interface RadioProps {
  arg: {
    type: ControlTypes;
    name: string;
    value: string;
    options?: unknown[] | Record<string, unknown>;
    control?: {
      options?: unknown[] | Record<string, unknown>;
      labels?: Array<string>;
    };
  };
  onChange: (value: unknown) => void;
}

const getOptions = (arg: RadioProps['arg']) => {
  if (arg.options) {
    return arg.options;
  }

  if (arg.control?.options) {
    return arg.control.options;
  }

  return [];
};

const RadioType = ({ onChange, arg }: RadioProps) => {
  const data = React.useMemo(() => {
    const options = getOptions(arg);

    if (Array.isArray(options)) {
      if (arg.control?.labels && Array.isArray(arg.control.labels)) {
        return options.map((val, i) => ({
          key: val,
          label: String(arg.control?.labels?.at(i) ?? val),
        }));
      }
      return options.map((val) => ({ key: val, label: String(val) }));
    }

    return Object.keys(options).map((key) => ({
      label: key,
      key: options[key],
    }));
  }, [arg]);
  const onChangeOption = React.useCallback((option: RadioItem) => onChange(option.key), [onChange]);

  return (
    <RadioSelect
      isInline={arg.type === 'inline-radio'}
      data={data}
      value={arg.value}
      onChange={onChangeOption}
    />
  );
};

export default RadioType;
