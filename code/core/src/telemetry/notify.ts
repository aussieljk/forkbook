import { cache } from '@aussieljk/forkbook/internal/common';
import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { dedent } from 'ts-dedent';

import { isOtelEnabled } from './otel.ts';

const TELEMETRY_KEY_NOTIFY_DATE = 'telemetry-notification-date';

let called = false;

/**
 * The end-user has already been notified about our telemetry integration. We don't need to
 * constantly annoy them about it. We will re-inform users about the telemetry if significant
 * changes are ever made.
 */
export const notify = async () => {
  // Without an OpenTelemetry endpoint, nothing is sent, so there is nothing to tell.
  if (!called && isOtelEnabled()) {
    called = true;

    if (!(await cache.get(TELEMETRY_KEY_NOTIFY_DATE, null))) {
      cache.set(TELEMETRY_KEY_NOTIFY_DATE, Date.now());
      logger.info(
        `Forkbook sends anonymous usage telemetry to ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}. To stop it, remove OTEL_EXPORTER_OTLP_ENDPOINT.`
      );
    }
  }
};
