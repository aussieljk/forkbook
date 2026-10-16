import { useTheme } from '@aussieljk/forkbook/internal/react-native-theming';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo } from 'react';
import { Platform, View } from 'react-native';

import { inputStyle } from './common.tsx';

export interface DateProps {
  arg: {
    name: string;
    value: Date;
  };
  onChange: (value: Date) => void;
}

const DateType = ({ onChange, arg: { name, value } }: DateProps) => {
  const theme = useTheme();

  const date = useMemo(() => {
    const dateValue = new Date(value);
    if (isNaN(dateValue.valueOf())) {
      return new Date();
    }

    return dateValue;
  }, [value]);

  const webDateString = useMemo(
    () =>
      `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(
        2,
        '0'
      )}T${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`,

    [date]
  );

  if (Platform.OS === 'web') {
    return (
      <View testID={name}>
        <input
          type="datetime-local"
          defaultValue={webDateString}
          onChange={(e) => {
            const target = e.currentTarget as EventTarget & { value: string };
            const newDate = new Date(target.value);
            onChange(newDate);
          }}
          // @ts-ignore
          style={inputStyle({ theme })}
        />
      </View>
    );
  }

  // iOS: the compact picker of the system, which opens the date and the time in a popover.
  return (
    <View testID={name}>
      <DateTimePicker
        value={date}
        mode="datetime"
        display="compact"
        onChange={(_event, picked) => {
          if (picked) onChange(picked);
        }}
      />
    </View>
  );
};

DateType.serialize = (value: any) => String(value);

DateType.deserialize = (value: any) => parseFloat(value);

export default DateType;
