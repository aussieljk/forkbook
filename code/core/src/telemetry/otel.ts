/**
 * OpenTelemetry export (for example to SigNoz). It is off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is
 * set. Then each telemetry event becomes a log record, and `withSpan` records a trace span.
 *
 * The OpenTelemetry packages are optional peer dependencies, so they load only when it is on. The
 * exporters read the standard `OTEL_EXPORTER_OTLP_*` variables, for example the headers.
 */
import type { AttributeValue, Attributes, Tracer } from '@opentelemetry/api';
import type { Logger } from '@opentelemetry/api-logs';

import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { version } from '../../package.json';

export const OTEL_PACKAGES = [
  '@opentelemetry/api',
  '@opentelemetry/context-async-hooks',
  '@opentelemetry/sdk-trace-base',
  '@opentelemetry/sdk-logs',
  '@opentelemetry/exporter-trace-otlp-http',
  '@opentelemetry/exporter-logs-otlp-http',
  '@opentelemetry/resources',
];

type Otel = {
  tracer: Tracer;
  eventLogger: Logger;
  errorStatus: number;
  flush: () => Promise<void>;
};

let loading: Promise<Otel | undefined> | undefined;

export const isOtelEnabled = () => !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

async function startOtel(): Promise<Otel> {
  const [
    api,
    { AsyncLocalStorageContextManager },
    { BasicTracerProvider, SimpleSpanProcessor },
    { LoggerProvider, SimpleLogRecordProcessor },
    { OTLPTraceExporter },
    { OTLPLogExporter },
    { resourceFromAttributes },
  ] = await Promise.all([
    import('@opentelemetry/api'),
    import('@opentelemetry/context-async-hooks'),
    import('@opentelemetry/sdk-trace-base'),
    import('@opentelemetry/sdk-logs'),
    import('@opentelemetry/exporter-trace-otlp-http'),
    import('@opentelemetry/exporter-logs-otlp-http'),
    import('@opentelemetry/resources'),
  ]);

  const resource = resourceFromAttributes({
    'service.name': process.env.OTEL_SERVICE_NAME ?? 'forkbook',
    'service.version': version,
  });

  // Simple processors send each span and record when it ends: Forkbook makes few of them, and a
  // CLI command can exit soon after.
  const tracerProvider = new BasicTracerProvider({
    resource,
    spanProcessors: [new SimpleSpanProcessor(new OTLPTraceExporter())],
  });
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [new SimpleLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  });

  // Nest the spans of async work under the span that started it.
  api.context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());

  return {
    tracer: tracerProvider.getTracer('forkbook', version),
    eventLogger: loggerProvider.getLogger('forkbook', version),
    errorStatus: api.SpanStatusCode.ERROR,
    flush: async () => {
      await Promise.all([tracerProvider.forceFlush(), loggerProvider.forceFlush()]);
    },
  };
}

/** Loads OpenTelemetry once. Returns undefined when it is off or its packages are missing. */
export function loadOtel(): Promise<Otel | undefined> {
  if (!isOtelEnabled()) {
    return Promise.resolve(undefined);
  }

  loading ??= startOtel().catch((error) => {
    logger.warn(
      `OTEL_EXPORTER_OTLP_ENDPOINT is set, but OpenTelemetry did not start (${String(error)}). ` +
        `Install these packages: ${OTEL_PACKAGES.join(' ')}`
    );
    return undefined;
  });
  return loading;
}

/** Flattens nested data into OpenTelemetry attributes, with dots in the keys. */
export function toAttributes(value: unknown, prefix = '', attributes: Attributes = {}): Attributes {
  if (value === undefined || value === null) {
    return attributes;
  }

  if (Array.isArray(value)) {
    attributes[prefix] = value.every((item) => typeof item === 'string')
      ? (value as string[])
      : JSON.stringify(value);
  } else if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      toAttributes(item, prefix ? `${prefix}.${key}` : key, attributes);
    }
  } else if (['string', 'number', 'boolean'].includes(typeof value)) {
    attributes[prefix] = value as AttributeValue;
  } else {
    attributes[prefix] = String(value);
  }

  return attributes;
}

/** Sends one telemetry event as a log record, and waits until it is sent. */
export async function emitOtelEvent(eventType: string, body: Record<string, unknown>) {
  const otel = await loadOtel();
  if (!otel) {
    return;
  }

  otel.eventLogger.emit({
    eventName: `forkbook.${eventType}`,
    body: eventType,
    attributes: toAttributes(body),
  });
  await otel.flush();
}

/** Runs `run` in a trace span. Without OpenTelemetry, it only runs `run`. */
export async function withSpan<T>(
  name: string,
  attributes: Attributes,
  run: () => Promise<T>
): Promise<T> {
  const otel = await loadOtel();
  if (!otel) {
    return run();
  }

  return otel.tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await run();
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: otel.errorStatus });
      throw error;
    } finally {
      span.end();
    }
  });
}
