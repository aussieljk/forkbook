import { beforeEach, expect, it, vi } from 'vitest';

import { emitOtelEvent } from './otel.ts';
import { sendErrorToSentry } from './sentry.ts';
import { setTelemetryEnabled, telemetry } from './index.ts';

vi.mock('./otel.ts', () => ({ emitOtelEvent: vi.fn(), withSpan: vi.fn() }));
vi.mock('./sentry.ts', () => ({ sendErrorToSentry: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  delete globalThis.FB_TELEMETRY_STATE;
});

it('drops events until telemetry is enabled', async () => {
  await telemetry('dev', { a: 1 });
  setTelemetryEnabled(false);
  await telemetry('dev', { a: 1 });

  expect(emitOtelEvent).not.toHaveBeenCalled();
});

it('sends an OpenTelemetry event when telemetry is enabled', async () => {
  setTelemetryEnabled(true);
  await telemetry('dev', async () => ({ a: 1 }));

  expect(emitOtelEvent).toHaveBeenCalledWith(
    'dev',
    expect.objectContaining({ payload: { a: 1 }, context: expect.any(Object) })
  );
  expect(sendErrorToSentry).not.toHaveBeenCalled();
});

it('sends error events to Sentry too, with force even when telemetry is off', async () => {
  setTelemetryEnabled(false);
  await telemetry('error', { error: new Error('boom') }, { force: true });

  expect(emitOtelEvent).toHaveBeenCalled();
  expect(sendErrorToSentry).toHaveBeenCalledWith(
    expect.objectContaining({ error: expect.objectContaining({ message: 'boom' }) }),
    expect.any(Object)
  );
});

it('never throws', async () => {
  setTelemetryEnabled(true);
  await expect(
    telemetry('dev', () => {
      throw new Error('payload failed');
    })
  ).resolves.toBeUndefined();
});
