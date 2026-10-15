declare module '@egoist/vue-to-react';
declare module 'acorn-jsx';
declare module 'vue/dist/vue';

declare var FEATURES: import('@aussieljk/forkbook/internal/types').StorybookConfigRaw['features'];
declare var __DOCS_CONTEXT__: import('react').Context<
  import('@aussieljk/forkbook/internal/types').DocsContextProps<
    import('@aussieljk/forkbook/internal/types').Renderer
  >
>;
declare var LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;
declare var TAGS_OPTIONS: import('@aussieljk/forkbook/internal/types').TagsOptions;

declare module '*.md';
declare module '*.md?raw';
