import type { ImageProps, ImageSourcePropType, TextStyle } from 'react-native';
import { transparentize } from 'polished';
import { ReactElement } from 'react';

export const color = {
  // Forkbook palette: the iOS system colours
  primary: '#007AFF', // systemBlue
  secondary: '#007AFF', // systemBlue
  secondaryLighter: 'rgba(0, 122, 255, 0.9)',
  tertiary: '#F2F2F7',
  ancillary: '#30B0C7',

  // Complimentary
  orange: '#FF9500',
  gold: '#FFCC00',
  green: '#34C759',
  seafoam: '#32ADE6',
  purple: '#AF52DE',
  ultraviolet: '#5856D6',

  // Monochrome
  lightest: '#FFFFFF',
  lighter: '#F2F2F7',
  light: '#E5E5EA',
  mediumlight: '#E5E5EA',
  medium: '#D1D1D6',
  mediumdark: '#8E8E93',
  dark: '#636366',
  darker: '#48484A',
  darkest: '#1C1C1E',

  // For borders
  border: 'rgba(60, 60, 67, 0.18)',

  // Status
  positive: '#34C759',
  negative: '#FF3B30',
  warning: '#FF9500',
  critical: '#FFFFFF',

  // Text
  defaultText: '#1C1C1E',
  inverseText: '#FFFFFF',
  positiveText: '#248A3D',
  negativeText: '#D70015',
  warningText: '#C93400',
};

export const background = {
  app: '#F2F2F7',
  bar: color.lightest,
  content: color.lightest,
  preview: color.lightest,
  gridCellSize: 10,
  hoverable: transparentize(0.9, color.secondary), // hover state for items in a list

  // Notification, error, and warning backgrounds
  positive: '#EAF9EE',
  negative: '#FFEBEA',
  warning: '#FFF4E5',
  critical: '#D70015',
};

export const typography = {
  weight: {
    regular: '400' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
  },
  size: {
    s1: 12,
    s2: 14,
    s3: 16,
    m1: 20,
    m2: 24,
    m3: 28,
    l1: 32,
    l2: 40,
    l3: 48,
    code: 90,
  },
};

export interface ThemeVars extends ThemeVarsBase, ThemeVarsColors {}

export interface ThemeVarsPartial extends ThemeVarsBase, Partial<ThemeVarsColors> {}

interface ThemeVarsBase {
  base: 'light' | 'dark';
}

export const light: ThemeVars = {
  base: 'light',

  // Forkbook-specific color palette
  colorPrimary: color.primary,
  colorSecondary: color.secondary,

  // UI
  appBg: background.app,
  appContentBg: color.lightest,
  appPreviewBg: color.lightest,
  appBorderColor: color.border,
  appBorderRadius: 4,

  // Fonts

  // Text colors
  textColor: color.darkest,
  textInverseColor: color.lightest,
  textMutedColor: color.dark,

  // Toolbar default and active colors
  barTextColor: color.mediumdark,
  barHoverColor: color.secondary,
  barSelectedColor: color.secondary,
  barBg: color.lightest,

  // Form colors
  buttonBg: background.app,
  buttonBorder: color.medium,
  booleanBg: color.mediumlight,
  booleanSelectedBg: color.lightest,
  inputBg: color.lightest,
  inputBorder: color.border,
  inputTextColor: color.darkest,
  inputBorderRadius: 4,
};

export interface ThemeVarsColors {
  colorPrimary: string;
  colorSecondary: string;

  // UI
  appBg: string;
  appContentBg: string;
  appPreviewBg: string;
  appBorderColor: string;
  appBorderRadius: number;

  // Text colors
  textColor: string;
  textInverseColor: string;
  textMutedColor: string;

  // Toolbar default and active colors
  barTextColor: string;
  barHoverColor: string;
  barSelectedColor: string;
  barBg: string;

  // Form colors
  buttonBg: string;
  buttonBorder: string;
  booleanBg: string;
  booleanSelectedBg: string;
  inputBg: string;
  inputBorder: string;
  inputTextColor: string;
  inputBorderRadius: number;

  brandTitle?: string;
  brandUrl?: string;
  brandImage?: string;
  brandTarget?: string;

  gridCellSize?: number;
}

export type Color = typeof color;
export type Background = typeof background;
export type Typography = typeof typography;

export type TextSize = number | string;
export interface Brand {
  // Will replace the storybook logo with this title
  title?: string | undefined;
  // This url we be opened when clicking the branded logo or title
  url?: string | null | undefined;
  // Define a an image source to replace storybook logo with
  image?: ImageSourcePropType | ReactElement | null | undefined;
  resizeMode?: ImageProps['resizeMode'] | null | undefined;
  target?: string | null | undefined;
}

export interface StorybookThemeWeb {
  base: 'light' | 'dark';
  color: Color;
  background: Background;
  typography: Typography;

  textMutedColor: string;

  input: {
    border: string;
    background: string;
    color: string;
    borderRadius: number;
    paddingHorizontal: number;
    paddingVertical: number;
  };

  button: {
    background: string;
    border: string;
  };

  boolean: {
    background: string;
    selectedBackground: string;
  };

  // UI
  layoutMargin: number;
  appBorderColor: string;
  appBorderRadius: number;

  // Toolbar default/active colors
  barTextColor: string;
  barHoverColor: string;
  barSelectedColor: string;
  barBg: string;

  brand?: Brand;

  // [key: string]: any;
}

export const dark: ThemeVars = {
  base: 'dark',

  // Forkbook palette: the iOS system colours (dark appearance)
  colorPrimary: '#0A84FF',
  colorSecondary: '#0A84FF',

  // UI
  appBg: '#000000',
  appContentBg: '#1C1C1E',
  appPreviewBg: color.lightest,
  appBorderColor: 'rgba(84, 84, 88, 0.6)',
  appBorderRadius: 4,

  // Text colors
  textColor: '#F2F2F7',
  textInverseColor: '#1C1C1E',
  textMutedColor: '#98989F',

  // Toolbar default and active colors
  barTextColor: '#98989F',
  barHoverColor: '#0A84FF',
  barSelectedColor: '#0A84FF',
  barBg: '#1C1C1E',

  // Form colors
  buttonBg: '#2C2C2E',
  buttonBorder: 'rgba(84, 84, 88, 0.6)',
  booleanBg: '#2C2C2E',
  booleanSelectedBg: '#3A3A3C',
  inputBg: '#2C2C2E',
  inputBorder: 'rgba(84, 84, 88, 0.6)',
  inputTextColor: color.lightest,
  inputBorderRadius: 4,
};
