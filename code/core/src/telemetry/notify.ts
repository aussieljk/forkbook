import { cache } from '@aussieljk/forkbook/internal/common';
import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { dedent } from 'ts-dedent';

const TELEMETRY_KEY_NOTIFY_DATE = 'telemetry-notification-date';

let called = false;

/**
 * The end-user has already been notified about our telemetry integration. We don't need to
 * constantly annoy them about it. We will re-inform users about the telemetry if significant
 * changes are ever made.
 */
export const notify = async () => {
  // Without a telemetry server, nothing is sent, so there is nothing to tell.
  if (!called && process.env.FORKBOOK_TELEMETRY_URL) {
    called = true;

    if (!(await cache.get(TELEMETRY_KEY_NOTIFY_DATE, null))) {
      cache.set(TELEMETRY_KEY_NOTIFY_DATE, Date.now());
      logger.info(
        'Forkbook sends anonymous usage telemetry to FORKBOOK_TELEMETRY_URL. To stop it, remove that environment variable.'
      );
    }
  }
};
