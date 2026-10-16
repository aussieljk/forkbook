import { color, typography } from '../base.ts';
import type { ThemeVars } from '../types.ts';

// The iOS system colours (dark appearance)
const border = 'rgba(84, 84, 88, 0.6)';

const theme: ThemeVars = {
  base: 'dark',

  // Forkbook-specific color palette
  colorPrimary: '#0A84FF', // systemBlue
  colorSecondary: '#0A84FF',

  // UI
  appBg: '#000000',
  appContentBg: '#1C1C1E', // systemGray6
  appHoverBg: '#2C2C2E',
  appPreviewBg: color.lightest,
  appBorderColor: border,
  appBorderRadius: 4,

  // Fonts
  fontBase: typography.fonts.base,
  fontCode: typography.fonts.mono,

  // Text colors
  textColor: '#F2F2F7',
  textInverseColor: '#1C1C1E',
  textMutedColor: '#98989F',

  // Toolbar default and active colors
  barTextColor: '#98989F',
  barHoverColor: '#F2F2F7',
  barSelectedColor: '#0A84FF',
  barBg: '#1C1C1E',

  // Form colors
  buttonBg: '#2C2C2E', // systemGray5
  buttonBorder: border,
  booleanBg: '#2C2C2E',
  booleanSelectedBg: '#3A3A3C', // systemGray4
  inputBg: '#2C2C2E',
  inputBorder: border,
  inputTextColor: '#F2F2F7',
  inputBorderRadius: 4,
};

export default theme;
