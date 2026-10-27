import { getBasename } from '@aussieljk/forkbook/internal/router';

import { global } from '../../shared/global.ts';
import type { RootPageGlobal } from '../../shared/root-page.ts';
import { isThumbnailUrl } from '../../shared/thumbnails.ts';

/** The start page settings from the server (`global.FORKBOOK_ROOT`). */
export const getRootPage = (): RootPageGlobal =>
  (global as { FORKBOOK_ROOT?: RootPageGlobal }).FORKBOOK_ROOT ?? {
    enabled: false,
    mode: 'above',
  };

/**
 * The `src` of a thumbnail from the index. A local thumbnail (`thumbnails/...`) is relative to the
 * Forkbook root, so it gets the base path. Then it is correct at each tree URL depth.
 */
export const thumbnailSrc = (thumbnail: string, base = getBasename()): string =>
  isThumbnailUrl(thumbnail) ? thumbnail : `${base}/${thumbnail.replace(/^\.?\/+/, '')}`;
