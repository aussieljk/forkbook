declare const BROWSER_CONFIG: object;
declare var FORKBOOK_BUILDER:
  | import('@aussieljk/forkbook/internal/types').SupportedBuilder
  | undefined;

interface ImportMetaEnv {
  __STORYBOOK_URL__?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*?raw' {
  const content: string;
  export default content;
}
