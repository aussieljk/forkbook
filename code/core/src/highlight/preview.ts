/* eslint-env browser */
import { definePreviewAddon } from '@aussieljk/forkbook/internal/csf';

import { addons } from '@aussieljk/forkbook/preview-api';

import type { HighlightTypes } from './types.ts';
import { useHighlights } from './useHighlights.ts';

if (globalThis?.FEATURES?.highlight && addons?.ready) {
  addons.ready().then(useHighlights);
}

export type { HighlightTypes };

export default () => definePreviewAddon<HighlightTypes>({});
