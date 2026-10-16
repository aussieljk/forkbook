import { Host, Slider } from '@expo/ui/swift-ui';
import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

interface SliderWrapperProps {
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  style?: StyleProp<ViewStyle>;
}

/** The slider of the system (SwiftUI, through @expo/ui). */
const SliderWrapper = ({
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  onSlidingComplete,
  style,
}: SliderWrapperProps) => {
  const latest = useRef(value ?? 0);

  return (
    <Host matchContents={{ vertical: true }} style={style}>
      <Slider
        value={value}
        min={minimumValue}
        max={maximumValue}
        step={step && step > 0 ? step : undefined}
        onValueChange={(next) => {
          latest.current = next;
          onValueChange?.(next);
        }}
        onEditingChanged={(editing) => {
          if (!editing) onSlidingComplete?.(latest.current);
        }}
      />
    </Host>
  );
};

export default SliderWrapper;
