import React from 'react';
import CustomSlider from './Slider.tsx';
import { Platform } from 'react-native';
import Slider from '@react-native-community/slider';

interface SliderWrapperProps {
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  style?: any;
  useBuiltInSlider?: boolean;
}

const supportedPlatforms = ['android', 'ios', 'windows', 'web'];
const nativeSliderSupported = supportedPlatforms.includes(Platform.OS);

const SliderWrapper = ({ useBuiltInSlider = false, ...props }: SliderWrapperProps) => {
  if (!nativeSliderSupported || useBuiltInSlider) {
    return <CustomSlider {...props} />;
  }
  return <Slider {...props} />;
};

export default SliderWrapper;
