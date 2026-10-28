/**
 * Sends error events to the one Forkbook Sentry project, so that errors from every project that
 * uses Forkbook show in one place. It uses the Sentry envelope API with `fetch`, so it needs no SDK.
 *
 * Error events come here only when telemetry is on (see `core.disableTelemetry`). The stack is
 * sent only when crash reports are on, and user paths are already removed (see `sanitize.ts`).
 * Set `FORKBOOK_SENTRY_DSN` to send to a different project, or to an empty string to stop it.
 */
import { randomUUID } from 'node:crypto';

import type { TelemetryData } from './types.ts';

const DEFAULT_DSN =
  'https://8a5d3f1dc20f5a43d5c1f0cbde30202c@o4510395505508352.ingest.us.sentry.io/4512332001509376';

function envelopeUrl(dsn: string) {
  const { protocol, username, host, pathname } = new URL(dsn);
  const projectId = pathname.slice(1);
  return `${protocol}//${host}/api/${projectId}/envelope/?sentry_key=${username}&sentry_version=7`;
}

type SentryError = { name?: string; message?: string; stack?: string };

function parseStack(stack: string | undefined) {
  const frames = (stack ?? '')
    .split('\n')
    .slice(1)
    .map((line) => line.trim().replace(/^at /, ''))
    .filter(Boolean)
    .map((line) => {
      const match =
        line.match(/^(.*?) \((.*):(\d+):(\d+)\)$/) ?? line.match(/^()(.*):(\d+):(\d+)$/);
      return match
        ? {
            function: match[1] || undefined,
            filename: match[2],
            lineno: +match[3],
            colno: +match[4],
          }
        : { function: line };
    });
  // Sentry wants the oldest frame first.
  return frames.reverse();
}

export async function sendErrorToSentry(data: TelemetryData, context: Record<string, any>) {
  const dsn = process.env.FORKBOOK_SENTRY_DSN ?? DEFAULT_DSN;
  if (!dsn) {
    return;
  }

  const { payload, metadata } = data;
  const error: SentryError = typeof payload.error === 'object' ? (payload.error ?? {}) : {};
  const type = error.name ?? payload.name ?? 'Error';
  const value = error.message ?? payload.code ?? payload.errorHash ?? 'Unknown error';
  const frames = parseStack(error.stack);

  const eventId = randomUUID().replaceAll('-', '');
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: 'error',
    release: `forkbook@${context.storybookVersion}`,
    environment: context.inCI ? 'ci' : 'local',
    exception: {
      values: [{ type, value, ...(frames.length ? { stacktrace: { frames } } : {}) }],
    },
    tags: {
      command: payload.eventType,
      code: payload.code,
      category: payload.category,
      blocking: payload.blocking,
      platform: context.platform,
      node: context.nodeVersion,
      framework: metadata?.framework?.name,
      renderer: metadata?.renderer,
    },
    user: context.anonymousId ? { id: context.anonymousId } : undefined,
    extra: { payload, context },
  };

  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');

  try {
    await fetch(envelopeUrl(dsn), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Error reports must never break Forkbook.
  }
}
