import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { ComponentMetaManager } from './componentMeta/ComponentMetaManager.ts';

let componentMetaManager: ComponentMetaManager | undefined | null;

/**
 * Process-wide {@link ComponentMetaManager} for the manifest generator and component tests. The
 * tsgo session keeps its programs between requests, so all callers in this process share one
 * session.
 *
 * The docgen service does not use this manager: it runs in a worker thread
 * ({@link ../docgen/docgen-worker.ts}) with its own manager.
 *
 * Returns `undefined` when tsgo cannot start, for example when its binary is missing.
 */
export function getSharedComponentMetaManager(): ComponentMetaManager | undefined {
  if (componentMetaManager === undefined) {
    try {
      componentMetaManager = new ComponentMetaManager();
    } catch (error) {
      logger.debug(`[reactComponentMeta] Cannot start tsgo: ${error}`);
      componentMetaManager = null;
    }
  }
  return componentMetaManager ?? undefined;
}

export function disposeSharedComponentMetaManager(): void {
  componentMetaManager?.dispose();
  componentMetaManager = undefined;
}
