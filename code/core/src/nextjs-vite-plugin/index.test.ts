import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NextConfigComplete } from 'next/dist/server/config-shared.js';

const requireResolveMock = vi.hoisted(() => vi.fn((id: string) => `/resolved/${id}`));
const loadConfigMock = vi.hoisted(() => vi.fn());
const getExecutionEnvironmentMock = vi.hoisted(() => vi.fn());
const getNextjsMajorVersionMock = vi.hoisted(() => vi.fn());

vi.mock('node:module', () => ({
  createRequire: () => ({
    resolve: requireResolveMock,
  }),
}));

vi.mock('next/dist/server/config.js', () => ({
  default: loadConfigMock,
}));

vi.mock('./plugins/next-dynamic/plugin', () => ({
  vitePluginNextDynamic: () => ({ name: 'next-dynamic' }),
}));

vi.mock('./plugins/next-env/plugin', () => ({
  vitePluginNextEnv: () => ({ name: 'next-env' }),
}));

vi.mock('./plugins/next-font/plugin', () => ({
  vitePluginNextFont: () => ({ name: 'next-font' }),
}));

vi.mock('./plugins/next-image/plugin', () => ({
  vitePluginNextImage: () => ({ name: 'next-image' }),
}));

vi.mock('./plugins/next-mocks/plugin', () => ({
  vitePluginNextMocks: () => ({ name: 'next-mocks' }),
}));

vi.mock('./plugins/next-swc/plugin', () => ({
  vitePluginNextSwc: () => ({ name: 'next-swc' }),
}));

vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils.ts')>();

  return {
    ...actual,
    getExecutionEnvironment: getExecutionEnvironmentMock,
    getNextjsMajorVersion: getNextjsMajorVersionMock,
    get isVitestEnv() {
      return process.env.VITEST === 'true';
    },
  };
});

const nextConfig = {
  compiler: undefined,
} as NextConfigComplete;

describe('VitePlugin', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.VITEST = 'false';

    loadConfigMock.mockResolvedValue(nextConfig);
    getExecutionEnvironmentMock.mockReturnValue('browser');
    getNextjsMajorVersionMock.mockReturnValue(16);
  });

  it('uses the native tsconfig paths support of Vite', async () => {
    const { default: VitePlugin } = await import('./index.ts');

    const plugins = VitePlugin({ dir: '/root' });
    const configPlugin = plugins[0];
    const config = await configPlugin?.config?.({});

    expect(config).toMatchObject({
      resolve: {
        alias: expect.any(Array),
        tsconfigPaths: true,
      },
    });
  });

  it('enables native tsconfig paths in Vitest environments', async () => {
    process.env.VITEST = 'true';

    const { default: VitePlugin } = await import('./index.ts');

    const plugins = VitePlugin({ dir: '/root' });
    const configPlugin = plugins[0];
    const config = await configPlugin?.config?.({});

    expect(config).toMatchObject({
      resolve: {
        tsconfigPaths: true,
      },
    });
    expect(config?.resolve).not.toHaveProperty('alias');
    expect(config?.test?.alias).toEqual(
      expect.objectContaining({
        'next/dist/compiled/react': '/resolved/next/dist/compiled',
        'next/dist/compiled/react-dom': '/resolved/next/dist/compiled',
      })
    );
  });
});
