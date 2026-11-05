import { useTheme } from '@aussieljk/forkbook/internal/react-native-theming';
import { useMemo, type CSSProperties } from 'react';
import { Platform, View } from 'react-native';
import { SelectModal } from '../components/SelectModal.tsx';
import { Input, inputStyle } from './common.tsx';
import type { ControlTypes } from '../sharedTypes.ts';

/** A select option value. The web `<select>` and the labels both key options by string. */
type OptionKey = string | number;

export interface SelectProps {
  arg: {
    name: string;
    value: OptionKey | OptionKey[] | undefined;
    options: OptionKey[] | Record<string, OptionKey>;
    control: {
      labels?: Record<string, string>;
    };
    type: ControlTypes;
  };
  onChange: (value: unknown) => void;
}

const getOptions = (options: SelectProps['arg']['options'], labels?: Record<string, string>) => {
  if (Array.isArray(options)) {
    return options.map((val) => ({ key: val, label: String(labels?.[val] || val) }));
  }

  return Object.keys(options).map((key) => ({
    label: String(key),
    key: options[key],
  }));
};

const SelectType = ({ arg, onChange }: SelectProps) => {
  const { value } = arg;
  const options = useMemo(
    () => getOptions(arg.options, arg.control.labels),
    [arg.control.labels, arg.options]
  );
  const theme = useTheme();

  const active = options.find(({ key }) => value === key);

  const selected = active?.label ?? '';

  if (Platform.OS === 'web') {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const target = event.currentTarget as EventTarget & {
        selectedOptions: ArrayLike<{ value: string }>;
        value: string;
      };

      if (arg.type === 'multi-select') {
        const selectedOptions = Array.from(target.selectedOptions);
        const selectedValues = selectedOptions.map((option) => option.value);
        onChange(selectedValues);
      } else {
        onChange(target.value);
      }
    };

    return (
      <select
        value={Array.isArray(value) ? value.map(String) : value}
        onChange={handleChange}
        multiple={arg.type === 'multi-select'}
        // React Native Web accepts the React Native style on a DOM element.
        style={inputStyle({ theme }) as CSSProperties}
      >
        {options.map(({ label, key }) => (
          <option key={`${label}-${key}`} value={key}>
            {label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <View>
      {arg.type === 'multi-select' ? (
        <SelectModal options={options} value={value} multiple onChange={onChange}>
          <Input
            editable={false}
            value={
              Array.isArray(value)
                ? value.map((v) => options.find((opt) => opt.key === v)?.label || v).join(', ')
                : String(selected)
            }
            autoCapitalize="none"
            underlineColorAndroid="transparent"
          />
        </SelectModal>
      ) : (
        <SelectModal options={options} value={value} onChange={onChange}>
          <Input
            editable={false}
            value={selected}
            autoCapitalize="none"
            underlineColorAndroid="transparent"
          />
        </SelectModal>
      )}
    </View>
  );
};

export default SelectType;
