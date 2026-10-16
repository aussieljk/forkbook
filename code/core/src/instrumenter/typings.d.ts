declare interface Window {
  __FORKBOOK_PREVIEW__: any;
  __FORKBOOK_ADDON_INTERACTIONS_INSTRUMENTER__: any;
  __FORKBOOK_ADDON_INTERACTIONS_INSTRUMENTER_STATE__: any;

  FEATURES: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['features'];
  LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;
}
