/**
 * Forkbook telemetry. Nothing goes to Storybook. Events go only to:
 *
 * - The Forkbook Sentry project, for `error` events only (see `sentry.ts`). This is on by default;
 *   an empty `FORKBOOK_SENTRY_DSN` stops it.
 * - Your own OpenTelemetry server, when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (see `otel.ts`).
 *
 * `core.disableTelemetry` (or `--disable-telemetry`) turns off both. Until a command calls
 * `setTelemetryEnabled`, events are dropped.
 */
import { isCI } from '@aussieljk/forkbook/internal/common';
import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { version } from '../../package.json';
import { detectAgent } from './detect-agent.ts';
import { emitOtelEvent } from './otel.ts';
import { sanitizeError } from './sanitize.ts';
import { sendErrorToSentry } from './sentry.ts';

export { withSpan } from './otel.ts';
export { oneWayHash } from './one-way-hash.ts';
export { ErrorCollector } from './error-collector.ts';
export { detectAgent, type AgentInfo } from './detect-agent.ts';
export * from './sanitize.ts';

export type EventType =
  | 'boot'
  | 'add'
  | 'dev'
  | 'build'
  | 'index'
  | 'init'
  | 'init-step'
  | 'scaffolded-empty'
  | 'browser'
  | 'canceled'
  | 'exit'
  | 'error'
  | 'version-update'
  | 'core-config'
  | 'remove'
  | 'save-story'
  | 'open-in-editor'
  | 'testing-module-watch-mode'
  | 'testing-module-completed-report'
  | 'testing-module-crash-report'
  | 'addon-test'
  | 'test-run'
  | 'mocking'
  | 'preview-first-load'
  | 'review'
  | 'share'
  | 'sidebar-filter'
  | 'tools-command'
  | 'skills-get'
  | 'ai-init-opt-in'
  | 'ai-prompt-nudge'
  | 'ai-setup'
  | 'ai-setup-self-healing-scoring'
  | 'addon-mcp';

export type Payload = Record<string, unknown>;

export type TelemetryOptions = {
  /** Send even when telemetry is off or not yet set. Used for error reports. */
  force?: boolean;
};

/** Is this story part of the CLI generated examples, including user-created stories in those files */
export const isExampleStoryId = (storyId: string) =>
  storyId.startsWith('example-button--') ||
  storyId.startsWith('example-header--') ||
  storyId.startsWith('example-page--');

// The state is on globalThis (`FB_TELEMETRY_STATE`), because this module can load more than once in
// one process, for example when an addon resolves its own copy of the package.

/** Call once the `disableTelemetry` setting is known. Events sent before this are dropped. */
export function setTelemetryEnabled(enabled: boolean) {
  globalThis.FB_TELEMETRY_STATE = enabled ? 'enabled' : 'disabled';
}

export function isTelemetryModuleEnabled() {
  return globalThis.FB_TELEMETRY_STATE === 'enabled';
}

export function isTelemetryStateResolved() {
  return globalThis.FB_TELEMETRY_STATE !== undefined;
}

/** Sent with every event. */
const context: Record<string, unknown> = {
  version,
  inCI: isCI(),
  platform: process.platform,
  nodeVersion: process.versions.node,
  agent: detectAgent()?.name,
};

export const addToGlobalContext = (key: string, value: unknown) => {
  context[key] = value;
};

/**
 * Sends one event. `payload` can be a function, so that work to make the payload runs only when
 * telemetry is on. Never throws.
 */
export async function telemetry(
  eventType: EventType,
  payload: Payload | (() => Payload | Promise<Payload>) = {},
  options: TelemetryOptions = {}
) {
  if (!isTelemetryModuleEnabled() && !options.force) {
    return;
  }

  try {
    const body = typeof payload === 'function' ? await payload() : { ...payload };
    if (body.error) {
      // Remove user paths from the error.
      body.error = sanitizeError(body.error as Error);
    }

    if (process.env.FORKBOOK_TELEMETRY_DEBUG) {
      logger.info(`[telemetry] ${JSON.stringify({ eventType, payload: body }, null, 2)}`);
    }

    await Promise.all([
      emitOtelEvent(eventType, { payload: body, context }),
      eventType === 'error' ? sendErrorToSentry(body, context) : undefined,
    ]);
  } catch (error) {
    logger.debug(`Telemetry event ${eventType} was not sent: ${String(error)}`);
  }
}
