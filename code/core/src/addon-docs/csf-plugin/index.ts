import type { EnrichCsfOptions } from 'storybook/internal/csf-tools';

import type { Plugin } from 'vite';

import { transformCsf } from './transform-csf.ts';

export type CsfPluginOptions = EnrichCsfOptions;

export function csfPlugin(options: EnrichCsfOptions): Plugin {
  return {
    name: 'plugin-csf',
    // Stay in the `pre` bucket with framework compilers, but run after their default-order
    // transforms so enrichment is not discarded when a plugin re-emits from its own source instead
    // of transforming `code`.
    enforce: 'pre',
    transform: {
      order: 'post',
      async handler(code, id) {
        return transformCsf(code, id, options);
      },
    },
  };
}
