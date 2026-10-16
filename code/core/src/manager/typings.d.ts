declare var DOCS_OPTIONS: any;
declare var CONFIG_TYPE: 'DEVELOPMENT' | 'PRODUCTION';
/**
 * The network address of the Forkbook instance. Used by Forkbook to generate a QR code so users
 * can access the story on mobile devices.
 */
declare var FORKBOOK_NETWORK_ADDRESS: string | undefined;

declare var __FORKBOOK_ADDONS_MANAGER: any;
declare var RELEASE_NOTES_DATA: any;

declare var FEATURES: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['features'];

declare var REFS: any;
declare var VERSIONCHECK: any;
declare var LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;

declare var __REACT__: any;
declare var __REACT_DOM__: any;
declare var __REACT_DOM_CLIENT__: any;
declare var __REACT_JSX_RUNTIME__: typeof import('react/jsx-runtime');
declare var __REACT_JSX_DEV_RUNTIME__: typeof import('react/jsx-dev-runtime');
declare var __FORKBOOK_COMPONENTS__: any;
declare var __FORKBOOK_CHANNELS__: any;
declare var __FORKBOOK_CORE_EVENTS__: any;
declare var __FORKBOOK_CORE_EVENTS_MANAGER_ERRORS__: any;
declare var __FORKBOOK_ROUTER__: any;
declare var __FORKBOOK_THEMING__: any;
declare var __FORKBOOK_THEMING_CREATE__: any;
declare var __FORKBOOK_TEST__: any;
declare var __FORKBOOK_ACTIONS__: any;
declare var __FORKBOOK_API__: any;
declare var __FORKBOOK_ICONS__: any;
declare var __FORKBOOK_CLIENT_LOGGER__: any;
declare var __FORKBOOK_ADDONS_CHANNEL__: any;
declare var __FORKBOOK_TYPES__: any;
declare var FORKBOOK_RENDERER: string | undefined;
declare var sendTelemetryError: (error: any) => void;
