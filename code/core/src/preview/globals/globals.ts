// Here we map the name of a module to their REFERENCE in the global scope.

export const globalsNameReferenceMap = {
  '@storybook/global': '__FORKBOOK_MODULE_GLOBAL__',

  '@aussieljk/forkbook/test': '__FORKBOOK_MODULE_TEST__',
  '@aussieljk/forkbook/actions': '__FORKBOOK_MODULE_ACTIONS__',
  '@aussieljk/forkbook/preview-api': '__FORKBOOK_MODULE_PREVIEW_API__',

  '@aussieljk/forkbook/internal/channels': '__FORKBOOK_MODULE_CHANNELS__',
  '@aussieljk/forkbook/internal/client-logger': '__FORKBOOK_MODULE_CLIENT_LOGGER__',
  '@aussieljk/forkbook/internal/core-events': '__FORKBOOK_MODULE_CORE_EVENTS__',
  '@aussieljk/forkbook/internal/preview-errors': '__FORKBOOK_MODULE_CORE_EVENTS_PREVIEW_ERRORS__',
  '@aussieljk/forkbook/internal/types': '__FORKBOOK_MODULE_TYPES__',

  // @deprecated TODO: Remove in 9.1 or some point in the future, I guess
  '@aussieljk/forkbook/internal/preview-api': '__FORKBOOK_MODULE_PREVIEW_API__',
} as const;

export const globalPackages = Object.keys(globalsNameReferenceMap) as Array<
  keyof typeof globalsNameReferenceMap
>;
