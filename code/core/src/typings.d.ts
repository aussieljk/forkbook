/// <reference path="../typings.d.ts" />

declare var CONFIG_TYPE: 'DEVELOPMENT' | 'PRODUCTION';
declare var FEATURES: import('./types/modules/core-common').StorybookConfigRaw['features'];
declare var LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;
declare var REFS: import('./types/modules/api').API_Refs | undefined;
/** The version check result as a JSON string. */
declare var VERSIONCHECK: string;

declare var FORKBOOK_WEBSOCKET_TOKEN: string;

declare var FORKBOOK_ADDON_STATE: Record<string, unknown>;
declare var FORKBOOK_BUILDER: import('./types/modules/builders').SupportedBuilder | undefined;
declare var FORKBOOK_FRAMEWORK: import('./types/modules/frameworks').SupportedFramework | undefined;
declare var FORKBOOK_RENDERER: import('./types/modules/renderers').SupportedRenderer | undefined;
declare var FORKBOOK_HOOKS_CONTEXT:
  | import('./preview-api/modules/addons/hooks').HooksContext<
      import('./types/modules/csf').Renderer
    >
  | undefined;
/** The stack of open clack task logs and task log groups. */
declare var FORKBOOK_CURRENT_TASK_LOG:
  | undefined
  | null
  | Array<
      | ReturnType<typeof import('@clack/prompts').taskLog>
      | ReturnType<ReturnType<typeof import('@clack/prompts').taskLog>['group']>
    >;
declare var FB_TELEMETRY_STATE: 'enabled' | 'disabled' | undefined;
declare var FORKBOOK_NETWORK_ADDRESS: string | undefined;

declare var __FORKBOOK_ADDON_INTERACTIONS_INSTRUMENTER__:
  | import('./instrumenter/instrumenter').Instrumenter
  | undefined;
declare var __FORKBOOK_ADDON_INTERACTIONS_INSTRUMENTER_STATE__: unknown;
declare var __FORKBOOK_ADDONS_CHANNEL__: import('./channels/types').ChannelLike | undefined;
declare var __FORKBOOK_ADDONS_MANAGER: import('./manager-api/lib/addons').AddonStore | undefined;
declare var __FORKBOOK_ADDONS_PREVIEW: import('./preview-api/modules/addons/main').AddonStore;
declare var __FORKBOOK_PREVIEW_NAVIGATOR__: boolean | undefined;
declare var __FORKBOOK_PREVIEW__:
  | import('./preview-api/modules/preview-web/PreviewWeb').PreviewWeb<
      import('./types/modules/csf').Renderer
    >
  | undefined;
declare var __FORKBOOK_STORY_STORE__:
  | import('./preview-api/modules/store/StoryStore').StoryStore<
      import('./types/modules/csf').Renderer
    >
  | undefined;
declare var __FORKBOOK_TEST__: unknown;
declare var __FORKBOOK_TEST_SPY_LISTENERS__: Set<(...args: unknown[]) => void>;
declare var __FORKBOOK_ACTIONS__: unknown;
declare var __FORKBOOK_VITEST_MOCKER__: unknown;

declare module 'ansi-to-html';
// CLI-only entry with no "types" condition in package.json exports.
declare module '@aussieljk/forkbook/internal/bin/loader' {
  const load: import('node:module').LoadHookSync;
  export { load };
}

declare var STORIES: unknown;

declare var CHANNEL_OPTIONS: { wsToken?: string; basePath?: string; maxDepth?: number } | undefined;
declare var INSECURE_IFRAME_MESSAGING: boolean | undefined;
// `autodocs` is the old `docs.autodocs` option, which the preview still reads.
declare var DOCS_OPTIONS:
  | (import('./types/modules/core-common').DocsOptions & { autodocs?: boolean | 'tag' })
  | undefined;
declare var TAGS_OPTIONS: import('./types/modules/core-common').StorybookConfigRaw['tags'];

// To enable user code to detect if it is running in Forkbook
declare var IS_STORYBOOK: boolean;

// ClientApi (and StoreStore) are really singletons. However they are not created until the
// relevant framework instantiates them via `start.js`. The good news is this happens right away.
declare var sendTelemetryError: (error: Error) => void;

declare class AnsiToHtml {
  constructor(options: { escapeHtml: boolean });

  toHtml: (ansi: string) => string;
}

declare module '*.md';
declare module '*.mdx';
declare module '*.png';
