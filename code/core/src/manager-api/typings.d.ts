declare var CONFIG_TYPE: string;
declare var FEATURES: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['features'];
declare var TAGS_OPTIONS: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['tags'];
declare var LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;
declare var FORKBOOK_FRAMEWORK:
  | import('@aussieljk/forkbook/internal/types').SupportedFramework
  | undefined;
declare var FORKBOOK_RENDERER:
  | import('@aussieljk/forkbook/internal/types').SupportedRenderer
  | undefined;
declare var FORKBOOK_BUILDER:
  | import('@aussieljk/forkbook/internal/types').SupportedBuilder
  | undefined;
