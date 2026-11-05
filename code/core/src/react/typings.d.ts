declare var FORKBOOK_ENV: 'react';
declare var FRAMEWORK_OPTIONS: { strictMode?: boolean } | undefined;
declare var LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;
declare var FEATURES: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['features'];

// The ESM build of react-element-to-jsx-string. Its package types only cover the main entry.
declare module 'react-element-to-jsx-string/dist/esm/index.js' {
  export { default } from 'react-element-to-jsx-string';
}
