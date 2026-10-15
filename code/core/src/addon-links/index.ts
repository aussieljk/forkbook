import { definePreviewAddon } from '@aussieljk/forkbook/internal/csf';

import * as addonAnnotations from './preview.ts';

export { linkTo, hrefTo, hrefToSync, withLinks, navigate } from './utils.ts';

export default () => definePreviewAddon(addonAnnotations);
