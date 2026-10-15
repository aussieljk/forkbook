import type {
  AddonTypes,
  InferTypes,
  PreviewAddon,
  PreviewAddonEntry,
} from '@aussieljk/forkbook/internal/csf';
import type { ProjectAnnotations } from '@aussieljk/forkbook/internal/types';

import type { ReactPreview } from '@aussieljk/forkbook/react';
import { __definePreview } from '@aussieljk/forkbook/react';
import type { ReactTypes } from '@aussieljk/forkbook/react';

import * as nextPreview from './preview.tsx';
import type { NextJsTypes } from './types.ts';

export * from '@aussieljk/forkbook/react';
// @ts-expect-error (double exports)
export * from './portable-stories.ts';
export * from './types.ts';

export function definePreview<Addons extends PreviewAddonEntry[]>(
  preview: { addons?: Addons } & ProjectAnnotations<ReactTypes & NextJsTypes & InferTypes<Addons>>
): NextPreview<InferTypes<Addons>> {
  return __definePreview({
    ...preview,
    addons: [nextPreview, ...(preview.addons ?? [])] as PreviewAddon<
      NextJsTypes & InferTypes<Addons>
    >[],
  });
}

export interface NextPreview<T extends AddonTypes> extends ReactPreview<NextJsTypes & T> {}
