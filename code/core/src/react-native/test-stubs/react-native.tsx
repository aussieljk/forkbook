// A small stand-in for `react-native` in the Node tests. The real package is Flow source for Metro.
import { createElement, forwardRef, type ReactNode } from 'react';

const host = (name: string) => {
  const Component = forwardRef<unknown, { children?: ReactNode }>(({ children }, _ref) =>
    createElement('rn-host', { name }, children)
  );
  Component.displayName = name;
  return Component;
};

export const View = host('View');
export const Text = host('Text');
export const TextInput = host('TextInput');
export const ScrollView = host('ScrollView');
export const Image = host('Image');
export const Pressable = host('Pressable');
export const TouchableOpacity = host('TouchableOpacity');
export const SafeAreaView = host('SafeAreaView');
export const Modal = host('Modal');
export const FlatList = host('FlatList');

export const Platform = {
  OS: 'ios' as const,
  select: <T,>(options: { ios?: T; default?: T }) => options.ios ?? options.default,
};

export const StyleSheet = {
  create: <T,>(styles: T) => styles,
  flatten: (style: unknown) => style,
  hairlineWidth: 1,
  absoluteFill: {},
  absoluteFillObject: {},
};

export const Keyboard = { dismiss: () => {} };
export const Dimensions = { get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }) };
export const Appearance = { getColorScheme: () => 'light' as const };
export const useColorScheme = () => 'light' as const;
export const useWindowDimensions = () => Dimensions.get();
export const Linking = { openURL: async (_url: string) => {} };
export const I18nManager = { isRTL: false };
