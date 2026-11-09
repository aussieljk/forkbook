import { describe, expect, it, vi } from 'vitest';

import { normaliseViteQueryFlags, viteQueryFlagsPlugin } from './vite-query-flags-plugin.ts';

describe('normaliseViteQueryFlags', () => {
  it('changes empty flag values back to bare flags', () => {
    expect(normaliseViteQueryFlags('/forkbook/a.toml?import=&raw=')).toBe(
      '/forkbook/a.toml?import&raw'
    );
    expect(normaliseViteQueryFlags('/a.svg?url=&inline=&worker=&direct=')).toBe(
      '/a.svg?url&inline&worker&direct'
    );
  });

  it('keeps other params, values and the hash', () => {
    expect(normaliseViteQueryFlags('/a.md?t=123&raw=&foo=#x')).toBe('/a.md?t=123&raw&foo=#x');
    expect(normaliseViteQueryFlags('/a.md?raw=1')).toBe('/a.md?raw=1');
  });

  it('keeps URLs with no query', () => {
    expect(normaliseViteQueryFlags('/a.md')).toBe('/a.md');
  });
});

describe('viteQueryFlagsPlugin', () => {
  it('adds a middleware that changes req.url', () => {
    const use = vi.fn();
    const plugin = viteQueryFlagsPlugin() as unknown as {
      configureServer: (server: unknown) => void;
    };
    plugin.configureServer({ middlewares: { use } });

    const middleware = use.mock.calls[0][0];
    const req = { url: '/a.toml?import=&raw=' };
    const next = vi.fn();
    middleware(req, {}, next);

    expect(req.url).toBe('/a.toml?import&raw');
    expect(next).toHaveBeenCalled();
  });
});
