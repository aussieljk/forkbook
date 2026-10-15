/**
 * OpenTelemetry for the repo scripts (verify, build, merge-agent, test reporter, Claude Code hooks).
 * It is off unless OTEL_EXPORTER_OTLP_ENDPOINT is set. The exporters read the standard
 * OTEL_EXPORTER_OTLP_* variables, so OTEL_EXPORTER_OTLP_HEADERS carries the SigNoz key.
 */
import { execSync } from 'node:child_process';
import { hostname } from 'node:os';

import { type Attributes, SpanStatusCode, context, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

export const otelEnabled = !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const git = (args: string) => {
  try {
    return execSync(`git ${args}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

/** Attributes on every span and log: the machine and the git state. */
export const repoAttributes = (): Attributes => ({
  'host.name': hostname().replace(/\.local$/, ''),
  'vcs.branch': git('rev-parse --abbrev-ref HEAD'),
  'vcs.commit': git('rev-parse --short HEAD'),
  'vcs.worktree': process.cwd().includes('.claude/worktrees') ? 'agent' : 'main',
});

function start(serviceName: string) {
  const resource = resourceFromAttributes({
    'service.name': serviceName,
    'service.namespace': 'forkbook-dev',
    ...repoAttributes(),
  });
  const tracerProvider = new BasicTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  });
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  });
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  trace.setGlobalTracerProvider(tracerProvider);
  return { tracerProvider, loggerProvider };
}

let providers: ReturnType<typeof start> | undefined;

/** Starts OpenTelemetry for one script. Call `flushOtel()` before the script exits. */
export function initOtel(serviceName: string) {
  if (otelEnabled) {
    providers ??= start(serviceName);
  }
}

export async function flushOtel() {
  await Promise.all([
    providers?.tracerProvider.forceFlush(),
    providers?.loggerProvider.forceFlush(),
  ]);
}

/** Runs `run` in a span. The span records an error when `run` throws. */
export async function withSpan<T>(
  name: string,
  attributes: Attributes,
  run: (setAttributes: (more: Attributes) => void) => Promise<T>
): Promise<T> {
  if (!providers) {
    return run(() => {});
  }
  return trace.getTracer('forkbook-dev').startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await run((more) => span.setAttributes(more));
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Sends one log record, for example a test failure or a hook event. */
export function emitEvent(name: string, attributes: Attributes, severityText = 'INFO') {
  providers?.loggerProvider.getLogger('forkbook-dev').emit({
    eventName: name,
    body: name,
    severityText,
    attributes,
  });
}

/** Runs synchronous work in a span, for example a `spawnSync` step. */
export function withSyncSpan<T>(
  name: string,
  attributes: Attributes,
  run: (setAttributes: (more: Attributes) => void) => T
): T {
  if (!providers) {
    return run(() => {});
  }
  const span = trace.getTracer('forkbook-dev').startSpan(name, { attributes });
  try {
    return run((more) => span.setAttributes(more));
  } finally {
    span.end();
  }
}

/** Marks the active span as failed. */
export function markFailed(message: string) {
  trace.getActiveSpan()?.setStatus({ code: SpanStatusCode.ERROR, message });
}
