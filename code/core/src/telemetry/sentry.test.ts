import { afterEach, expect, it, vi } from 'vitest';

import { sendErrorToSentry } from './sentry.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('posts the error as a Sentry envelope', async () => {
  const fetchMock = vi.fn(async () => new Response());
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('FORKBOOK_SENTRY_DSN', 'https://key@o1.ingest.sentry.io/42');

  await sendErrorToSentry(
    {
      eventType: 'error',
      payload: {
        eventType: 'dev',
        error: {
          name: 'TypeError',
          message: 'boom',
          stack: 'TypeError: boom\n    at run ($SNIP/a.js:1:2)',
        },
      },
    },
    { storybookVersion: '1.0.0' }
  );

  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://o1.ingest.sentry.io/api/42/envelope/?sentry_key=key&sentry_version=7');
  const event = JSON.parse(String(init.body).split('\n')[2]);
  expect(event.exception.values[0]).toEqual({
    type: 'TypeError',
    value: 'boom',
    stacktrace: { frames: [{ function: 'run', filename: '$SNIP/a.js', lineno: 1, colno: 2 }] },
  });
  expect(event.tags.command).toBe('dev');
});

it('sends nothing when the DSN is empty', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('FORKBOOK_SENTRY_DSN', '');

  await sendErrorToSentry({ eventType: 'error', payload: {} }, {});

  expect(fetchMock).not.toHaveBeenCalled();
});
