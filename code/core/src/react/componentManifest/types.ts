import type { ComponentImportRef } from '@aussieljk/forkbook/internal/csf-tools';

import type { ComponentDoc } from './componentMeta/componentMetaExtractor.ts';

export type ComponentRef = ComponentImportRef & {
  componentJsDocTags?: Record<string, string[]>;
  path?: string;
  isPackage: boolean;
  /** Minimum JSX nesting depth where this component first appears (1 = outermost JSX element). */
  jsxDepth?: number;
  reactComponentMeta?: ComponentDoc;
};
