declare var __STORYBOOK_ADDONS_MANAGER: any;

declare var CONFIG_TYPE: string;
declare var FEATURES: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['features'];
declare var TAGS_OPTIONS: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['tags'];
declare var REFS: any;
declare var VERSIONCHECK: any;
declare var LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;
declare var FORKBOOK_ADDON_STATE: Record<string, any>;
declare var FORKBOOK_FRAMEWORK:
  | import('@aussieljk/forkbook/internal/types').SupportedFramework
  | undefined;
declare var FORKBOOK_RENDERER:
  | import('@aussieljk/forkbook/internal/types').SupportedRenderer
  | undefined;
declare var FORKBOOK_BUILDER:
  | import('@aussieljk/forkbook/internal/types').SupportedBuilder
  | undefined;
declare var FORKBOOK_LAST_EVENTS: Record<
  import('@aussieljk/forkbook/telemetry').EventType,
  import('@aussieljk/forkbook/telemetry').CacheEntry
>;
declare var FORKBOOK_SESSION_ID: string | undefined;
