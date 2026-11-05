declare interface Window {
  __FORKBOOK_ADDON_INTERACTIONS_INSTRUMENTER__?: import('./instrumenter').Instrumenter;
  __FORKBOOK_ADDON_INTERACTIONS_INSTRUMENTER_STATE__?: Record<string, import('./types').State>;

  FEATURES: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['features'];
  LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;
}
