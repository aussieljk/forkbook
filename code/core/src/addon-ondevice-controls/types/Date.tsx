import { DatePicker, Host } from '@expo/ui/swift-ui';
import { useMemo } from 'react';

export interface DateProps {
  arg: {
    name: string;
    value: Date;
  };
  onChange: (value: Date) => void;
}

/** The compact date and time picker of the system (SwiftUI, through @expo/ui). */
const DateType = ({ onChange, arg: { name, value } }: DateProps) => {
  const date = useMemo(() => {
    const dateValue = new Date(value);
    return isNaN(dateValue.valueOf()) ? new Date() : dateValue;
  }, [value]);

  return (
    <Host matchContents testID={name}>
      <DatePicker
        selection={date}
        displayedComponents={['date', 'hourAndMinute']}
        onDateChange={onChange}
      />
    </Host>
  );
};

DateType.serialize = (value: any) => String(value);

DateType.deserialize = (value: any) => parseFloat(value);

export default DateType;
