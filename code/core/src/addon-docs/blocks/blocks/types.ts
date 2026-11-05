import type { ModuleExport } from '@aussieljk/forkbook/internal/types';

export const PRIMARY_STORY = '^';

/** A component, or the tag name of a custom element. */
export type Component =
  | string
  | { name?: string; __docgenInfo?: { displayName?: string } }
  | null
  | undefined;

export type DocsStoryProps = {
  of: ModuleExport;
  expanded?: boolean;
  withToolbar?: boolean;
  __forceInitialArgs?: boolean;
  __primary?: boolean;
};
