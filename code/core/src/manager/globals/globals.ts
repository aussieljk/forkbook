// Here we map the name of a module to their REFERENCE in the global scope.
export const globalsNameReferenceMap = {
  react: '__REACT__',
  'react/jsx-runtime': '__REACT_JSX_RUNTIME__',
  'react/jsx-dev-runtime': '__REACT_JSX_DEV_RUNTIME__',
  'react-dom': '__REACT_DOM__',
  'react-dom/client': '__REACT_DOM_CLIENT__',
  '@phosphor-icons/react': '__FORKBOOK_ICONS__',

  '@aussieljk/forkbook/manager-api': '__FORKBOOK_API__',

  '@aussieljk/forkbook/theming': '__FORKBOOK_THEMING__',
  '@aussieljk/forkbook/theming/create': '__FORKBOOK_THEMING_CREATE__',

  '@aussieljk/forkbook/test': '__FORKBOOK_TEST__',

  '@aussieljk/forkbook/internal/channels': '__FORKBOOK_CHANNELS__',
  '@aussieljk/forkbook/internal/client-logger': '__FORKBOOK_CLIENT_LOGGER__',
  '@aussieljk/forkbook/internal/components': '__FORKBOOK_COMPONENTS__',
  '@aussieljk/forkbook/internal/core-events': '__FORKBOOK_CORE_EVENTS__',
  '@aussieljk/forkbook/internal/manager-errors': '__FORKBOOK_CORE_EVENTS_MANAGER_ERRORS__',
  '@aussieljk/forkbook/internal/router': '__FORKBOOK_ROUTER__',
  '@aussieljk/forkbook/internal/types': '__FORKBOOK_TYPES__',
} as const;

export const globalPackages = Object.keys(globalsNameReferenceMap) as Array<
  keyof typeof globalsNameReferenceMap
>;
