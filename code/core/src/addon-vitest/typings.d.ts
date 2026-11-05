declare const BROWSER_CONFIG: object;
declare var FORKBOOK_BUILDER:
  | import('@aussieljk/forkbook/internal/types').SupportedBuilder
  | undefined;

interface ImportMetaEnv {
  __FORKBOOK_URL__?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*?raw' {
  const content: string;
  export default content;
}

/** Provided by the builder-vite `storybook-project-annotations-plugin`. */
declare module 'virtual:/@storybook/builder-vite/project-annotations.js' {
  export function getProjectAnnotations(): import('@aussieljk/forkbook/internal/types').ProjectAnnotations<
    import('@aussieljk/forkbook/internal/types').Renderer
  >;
}
