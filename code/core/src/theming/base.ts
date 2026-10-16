export const easing = {
  rubber: 'cubic-bezier(0.175, 0.885, 0.335, 1.05)',
};

export const color = {
  // Forkbook palette: the iOS system colours (light appearance)
  primary: '#007AFF', // systemBlue
  secondary: '#007AFF', // systemBlue
  tertiary: '#F2F2F7', // systemGray6
  ancillary: '#30B0C7', // systemTeal

  // Complimentary
  orange: '#FF9500', // systemOrange
  gold: '#FFCC00', // systemYellow
  green: '#34C759', // systemGreen
  seafoam: '#32ADE6', // systemCyan
  purple: '#AF52DE', // systemPurple
  ultraviolet: '#5856D6', // systemIndigo

  // Monochrome (iOS system greys)
  lightest: '#FFFFFF',
  lighter: '#F2F2F7', // systemGray6
  light: '#E5E5EA', // systemGray5
  mediumlight: '#E5E5EA', // systemGray5
  medium: '#D1D1D6', // systemGray4
  mediumdark: '#8E8E93', // systemGray
  dark: '#636366', // systemGray2 (dark)
  darker: '#48484A', // systemGray3 (dark)
  darkest: '#1C1C1E', // systemGray6 (dark)

  // For borders (iOS separator)
  border: 'rgba(60, 60, 67, 0.18)',

  // Status
  positive: '#34C759',
  warning: '#FF9500',
  negative: '#FF3B30',
  critical: '#FFFFFF',

  // Text (iOS accessible colours)
  defaultText: '#1C1C1E',
  inverseText: '#FFFFFF',
  positiveText: '#248A3D',
  warningText: '#C93400',
  negativeText: '#D70015',
};

export const background = {
  app: '#F2F2F7',
  bar: color.lightest,
  content: color.lightest,
  preview: color.lightest,
  gridCellSize: 10,
  hoverable: '#E5F1FF',

  // Notification, error, and warning backgrounds
  positive: '#EAF9EE',
  warning: '#FFF4E5',
  negative: '#FFEBEA',
  critical: '#D70015',
};

export const typography = {
  fonts: {
    base: [
      '"Inter Variable"',
      'Inter',
      '-apple-system',
      '".SFNSText-Regular"',
      '"San Francisco"',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(', '),
    mono: [
      'ui-monospace',
      'Menlo',
      'Monaco',
      '"Roboto Mono"',
      '"Oxygen Mono"',
      '"Ubuntu Monospace"',
      '"Source Code Pro"',
      '"Droid Sans Mono"',
      '"Courier New"',
      'monospace',
    ].join(', '),
  },
  weight: {
    regular: 400,
    bold: 700,
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

export const tokens = {
  light: {
    fgColor: {
      default: color.darkest,
      muted: color.dark,
      accent: color.secondary,
      inverse: color.lightest,
      // TODO: add 'disabled'
      positive: '#248A3D',
      warning: '#C93400',
      negative: '#D70015',
      critical: '#FFFFFF',
      agentic: '#8944AB',
    },
    bgColor: {
      default: color.lightest,
      muted: background.app,
      // TODO: add 'accent'? white or blue?
      positive: '#EAF9EE',
      warning: '#FFF4E5',
      negative: '#FFEBEA',
      critical: '#D70015',
      agentic: '#F7EEFC',
    },
    borderColor: {
      default: color.border,
      muted: 'rgba(0, 0, 0, 0.1)',
      inverse: 'rgba(255, 255, 255, 0.1)',
      positive: '#B4E9C1',
      warning: '#FFD9A3',
      negative: '#FFC2BE',
      critical: 'rgba(255, 255, 255, 0)',
      agentic: '#E5CCF4',
    },
  },
  dark: {
    fgColor: {
      default: '#F2F2F7',
      muted: '#98989F',
      accent: '#0A84FF',
      inverse: '#1C1C1E',
      // TODO: add 'disabled'
      positive: '#30D158',
      warning: '#FF9F0A',
      negative: '#FF453A',
      critical: '#FF453A',
      agentic: '#BF5AF2',
    },
    bgColor: {
      default: '#1C1C1E',
      muted: '#000000',
      // TODO: add 'accent'? white or blue?
      positive: 'rgba(48, 209, 88, 0)',
      warning: 'rgba(255, 159, 10, 0)',
      negative: 'rgba(255, 69, 58, 0)',
      critical: 'rgba(255, 69, 58, 0)',
      agentic: 'rgba(191, 90, 242, 0.15)',
    },
    borderColor: {
      default: 'rgba(84, 84, 88, 0.6)',
      muted: 'rgba(255, 255, 255, 0.5)',
      inverse: 'rgba(0, 0, 0, 0.1)',
      positive: 'rgba(48, 209, 88, 0.2)',
      warning: 'rgba(255, 159, 10, 0.2)',
      negative: 'rgba(255, 69, 58, 0.2)',
      critical: '#FF453A',
      agentic: 'rgba(191, 90, 242, 0.35)',
    },
  },
};
