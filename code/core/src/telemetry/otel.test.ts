import { type Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { toAttributes } from './otel.ts';

describe('toAttributes', () => {
  it('flattens nested objects into dotted keys', () => {
    expect(
      toAttributes({
        eventId: 'abc',
        payload: { framework: { name: 'react-vite' }, count: 3, ok: true, missing: undefined },
        tags: ['a', 'b'],
        addons: [{ name: 'docs' }],
      })
    ).toEqual({
      eventId: 'abc',
      'payload.framework.name': 'react-vite',
      'payload.count': 3,
      'payload.ok': true,
      tags: ['a', 'b'],
      addons: '[{"name":"docs"}]',
    });
  });
});

describe('without OTEL_EXPORTER_OTLP_ENDPOINT', () => {
  it('runs the work and sends nothing', async () => {
    vi.resetModules();
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', '');
    const { loadOtel, withSpan } = await import('./otel.ts');

    expect(await loadOtel()).toBeUndefined();
    expect(await withSpan('work', {}, async () => 42)).toBe(42);
    vi.unstubAllEnvs();
  });
});

describe('with OTEL_EXPORTER_OTLP_ENDPOINT', () => {
  const received: { path: string; body: string }[] = [];
  let server: Server;

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = '';
      request.on('data', (chunk) => (body += chunk));
      request.on('end', () => {
        received.push({ path: request.url ?? '', body });
        response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', `http://127.0.0.1:${port}`);
    vi.stubEnv('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/json');
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await new Promise((resolve) => server.close(resolve));
  });

  it('sends events as logs and work as nested spans', async () => {
    vi.resetModules();
    const { emitOtelEvent, loadOtel, withSpan } = await import('./otel.ts');

    await emitOtelEvent('dev', { payload: { framework: 'react-vite' } });
    await withSpan('forkbook dev', {}, () => withSpan('forkbook.story-index', {}, async () => 1));
    await (await loadOtel())!.flush();

    const logs = received.filter(({ path }) => path === '/v1/logs').map(({ body }) => body);
    const traces = received.filter(({ path }) => path === '/v1/traces').map(({ body }) => body);

    expect(logs.join()).toContain('forkbook.dev');
    expect(logs.join()).toContain('payload.framework');
    expect(logs.join()).toContain('"forkbook"');
    expect(traces.join()).toContain('forkbook.story-index');

    const spans = traces.flatMap((body) =>
      JSON.parse(body).resourceSpans.flatMap((r: any) => r.scopeSpans.flatMap((s: any) => s.spans))
    );
    const parent = spans.find((span: any) => span.name === 'forkbook dev');
    const child = spans.find((span: any) => span.name === 'forkbook.story-index');
    expect(child.parentSpanId).toBe(parent.spanId);
  });
});
