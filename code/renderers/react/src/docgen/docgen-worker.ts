/**
 * Worker-target docgen module for the React renderer.
 *
 * Core's docgen worker imports this module and calls {@link createDocgenProvider} once to build the
 * middleware it folds into the provider chain. Everything here runs inside that worker thread, so
 * the tsgo requests of the {@link ComponentMetaManager} do not block the main event loop. The React
 * renderer implements no threading itself — it only describes this module to core through the
 * `experimental_docgenProvider` preset.
 *
 * This provider needs no configuration: tsgo finds the tsconfig of each story file itself.
 */
import { createLazyDocgenMiddleware } from 'storybook/internal/common';
import { logger } from 'storybook/internal/node-logger';
import type { DocgenMiddleware } from 'storybook/internal/types';

import { ComponentMetaManager } from '../componentManifest/componentMeta/ComponentMetaManager.ts';
import { buildDocgenPayload } from './buildDocgen.ts';

/**
 * Builds the React docgen middleware. Owns one {@link ComponentMetaManager} for the worker's
 * lifetime so the tsgo programs stay warm across components. The manager is created lazily on the
 * first eligible request; when tsgo cannot start, the middleware passes through to the rest of the
 * chain.
 */
export const createDocgenProvider = (): DocgenMiddleware =>
  createLazyDocgenMiddleware({
    createManager: async () => {
      try {
        return new ComponentMetaManager();
      } catch (err) {
        logger.debug(`[reactComponentMeta] Docgen provider disabled: ${err}`);
        return undefined;
      }
    },
    extract: (componentMetaManager, input) => buildDocgenPayload(input, { componentMetaManager }),
  });
