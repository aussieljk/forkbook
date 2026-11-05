// DOCS_OPTIONS, REFS, VERSIONCHECK and the shared __FORKBOOK_* globals are declared in
// `src/typings.d.ts`.
declare var CONFIG_TYPE: 'DEVELOPMENT' | 'PRODUCTION';
/**
 * The network address of the Forkbook instance. Used by Forkbook to generate a QR code so users
 * can access the story on mobile devices.
 */
declare var FORKBOOK_NETWORK_ADDRESS: string | undefined;

declare var FEATURES: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['features'];

declare var LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;

declare var __REACT_JSX_RUNTIME__: typeof import('react/jsx-runtime');
declare var __REACT_JSX_DEV_RUNTIME__: typeof import('react/jsx-dev-runtime');
declare var FORKBOOK_RENDERER: string | undefined;
