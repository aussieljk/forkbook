import { describe, expect, it, vi } from 'vitest';

import { tailwindRefreshPlugin, usesTailwind } from './plugin.ts';

describe('usesTailwind', () => {
  it('finds the Tailwind entries', () => {
    expect(usesTailwind('@import "tailwindcss";')).toBe(true);
    expect(usesTailwind("@import 'tailwindcss/theme.css' layer(theme);")).toBe(true);
    expect(usesTailwind('@tailwind base;')).toBe(true);
    expect(usesTailwind('body { color: red; }')).toBe(false);
  });
});

describe('tailwindRefreshPlugin', () => {
  const setup = () => {
    const plugin = tailwindRefreshPlugin();
    const listeners: Record<string, (file: string) => void> = {};
    const cssModule = { id: '/app/globals.css' };
    const graph = {
      getModulesByFile: vi.fn((file: string) =>
        file === '/app/globals.css' ? new Set([cssModule]) : undefined
      ),
      invalidateModule: vi.fn(),
    };
    const reloadModule = vi.fn(async () => {});
    const server = {
      watcher: {
        on: (event: string, fn: (file: string) => void) => {
          listeners[event] = fn;
        },
      },
      environments: { client: { moduleGraph: graph, reloadModule } },
    };
    (plugin.configureServer as any)(server);
    const transform = (code: string, id: string) => (plugin.transform as any)(code, id);
    return { listeners, graph, reloadModule, cssModule, transform };
  };

  it('reloads the Tailwind CSS when a source file is added', async () => {
    const { listeners, graph, reloadModule, cssModule, transform } = setup();
    transform('@import "tailwindcss";', '/app/globals.css');
    transform('body {}', '/app/plain.css');

    listeners.add('/app/components/New.tsx');
    await vi.waitFor(() => expect(reloadModule).toHaveBeenCalledWith(cssModule));
    expect(graph.invalidateModule).toHaveBeenCalledWith(cssModule);
    expect(graph.getModulesByFile).not.toHaveBeenCalledWith('/app/plain.css');
  });

  it('does nothing for files that are not source files', async () => {
    const { listeners, reloadModule, transform } = setup();
    transform('@import "tailwindcss";', '/app/globals.css');

    listeners.add('/app/image.png');
    listeners.add('/app/node_modules/x/index.js');
    await new Promise((r) => setTimeout(r, 0));
    expect(reloadModule).not.toHaveBeenCalled();
  });
});
