import { afterEach, expect, it, vi } from 'vitest';

import { emitOtelEvent } from './otel.ts';
import { sendTelemetry } from './telemetry.ts';

vi.mock('./otel.ts', () => ({ emitOtelEvent: vi.fn() }));
vi.mock('./event-cache', () => {
  return { set: vi.fn() };
});

vi.mock('./session-id', () => {
  return {
    getSessionId: async () => {
      return 'session-id';
    },
  };
});

const emitMock = vi.mocked(emitOtelEvent);

afterEach(() => {
  vi.clearAllMocks();
});

it('sends the event with its data', async () => {
  await sendTelemetry({ eventType: 'dev', payload: { foo: 'bar' } });

  expect(emitMock).toHaveBeenCalledTimes(1);
  expect(emitMock).toHaveBeenCalledWith(
    'dev',
    expect.objectContaining({
      sessionId: 'session-id',
      eventId: expect.any(String),
      payload: { foo: 'bar' },
      context: expect.objectContaining({ nodeVersion: process.versions.node }),
    })
  );
});

it('does not throw when sending fails', async () => {
  emitMock.mockRejectedValueOnce(new Error('network down'));

  await expect(sendTelemetry({ eventType: 'dev', payload: {} })).resolves.toBeUndefined();
});

it('await all pending telemetry when passing in immediate = true', async () => {
  let resolvedTasks = 0;
  emitMock.mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    resolvedTasks += 1;
  });

  sendTelemetry({ eventType: 'init', payload: {} });
  sendTelemetry({ eventType: 'dev', payload: {} });

  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(emitMock).toHaveBeenCalledTimes(2);
  expect(resolvedTasks).toBe(0);

  await sendTelemetry({ eventType: 'error', payload: {} }, { immediate: true });

  expect(emitMock).toHaveBeenCalledTimes(3);
  expect(resolvedTasks).toBe(3);
});
