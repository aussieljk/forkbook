import type { MetroConfig } from 'metro-config';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { generate } from '../scripts/generate.ts';
import { createChannelServer } from './channelServer.ts';
import { withForkbook } from './withForkbook.ts';

vi.mock('./channelServer.ts', () => ({
  createChannelServer: vi.fn(),
}));

vi.mock('../scripts/generate.ts', () => ({
  generate: vi.fn(),
}));

describe('withForkbook', () => {
  const config = { resolver: {}, transformer: {} } as MetroConfig;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.FORKBOOK_WS_HOST;
    delete process.env.FORKBOOK_WS_PORT;
    delete process.env.FORKBOOK_WS_SECURED;
    delete process.env.FORKBOOK_SERVER;
  });

  test('generates the requires file and starts no channel server by default', () => {
    withForkbook(config, { configPath: '/tmp/.rnforkbook', enabled: true });

    expect(createChannelServer).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledWith({
      configPath: '/tmp/.rnforkbook',
      useJs: false,
      docTools: true,
    });
  });

  test('starts the channel server for websockets "auto"', () => {
    withForkbook(config, {
      configPath: '/tmp/.rnforkbook',
      enabled: true,
      websockets: 'auto',
    });

    expect(createChannelServer).toHaveBeenCalledWith(
      expect.objectContaining({ host: undefined, port: 7007, websockets: true })
    );
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ host: 'auto', port: 7007 }));
  });

  test('does not start the channel server when FORKBOOK_SERVER is false', () => {
    process.env.FORKBOOK_SERVER = 'false';

    withForkbook(config, {
      configPath: '/tmp/.rnforkbook',
      enabled: true,
      websockets: 'auto',
    });

    expect(createChannelServer).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalled();
  });

  test('passes secure websocket options through to the channel server and generator', () => {
    withForkbook(config, {
      configPath: '/tmp/.rnforkbook',
      enabled: true,
      websockets: {
        host: '127.0.0.1',
        port: 7007,
        secured: true,
        cert: 'cert',
        key: 'key',
      },
    });

    expect(createChannelServer).toHaveBeenCalledWith(
      expect.objectContaining({
        configPath: '/tmp/.rnforkbook',
        websockets: true,
        secured: true,
        ssl: expect.objectContaining({
          cert: 'cert',
          key: 'key',
        }),
      })
    );

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        configPath: '/tmp/.rnforkbook',
        host: '127.0.0.1',
        port: 7007,
        secured: true,
      })
    );
  });

  test('does not generate when storybook is disabled', () => {
    expect(() =>
      withForkbook(config, { configPath: '/tmp/.rnforkbook', enabled: false })
    ).not.toThrow();
    expect(generate).not.toHaveBeenCalled();
  });

  test('applies FORKBOOK_WS_* env when websockets option is omitted', () => {
    process.env.FORKBOOK_WS_HOST = '192.168.1.10';
    process.env.FORKBOOK_WS_PORT = '8123';

    withForkbook(config, { configPath: '/tmp/.rnforkbook', enabled: true });

    expect(createChannelServer).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '192.168.1.10',
        port: 8123,
        websockets: true,
      })
    );

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        configPath: '/tmp/.rnforkbook',
        host: '192.168.1.10',
        port: 8123,
      })
    );
  });
});

describe('withForkbook resolution', () => {
  const resolveRequest = vi.fn((_ctx: any, name: string) => ({
    filePath: `/node_modules/${name}/index.js`,
    type: 'sourceFile',
  }));

  const config = {
    resolver: { resolveRequest },
    transformer: {},
  } as unknown as MetroConfig;

  const resolve = (result: MetroConfig, ...args: [any, string, string]) =>
    (result.resolver as any).resolveRequest(...args);

  test.each(['os', 'tty'])('replaces %s with empty on native platforms', (mod) => {
    const result = withForkbook(config, { configPath: '/tmp/.rnforkbook', enabled: true });

    expect(resolve(result, {}, mod, 'ios')).toEqual({ type: 'empty' });
    expect(resolve(result, {}, mod, 'android')).toEqual({ type: 'empty' });
  });

  test.each(['os', 'tty'])('preserves real %s on web for Expo API Routes', (mod) => {
    const result = withForkbook(config, { configPath: '/tmp/.rnforkbook', enabled: true });
    expect(resolve(result, {}, mod, 'web')).not.toEqual({ type: 'empty' });
  });

  test.each(['os', 'tty'])('also replaces %s when storybook is disabled', (mod) => {
    const result = withForkbook(config, { configPath: '/tmp/.rnforkbook', enabled: false });
    const ctx = { resolveRequest };

    expect(resolve(result, ctx, mod, 'ios')).toEqual({ type: 'empty' });
    expect(resolve(result, ctx, mod, 'web')).not.toEqual({ type: 'empty' });
  });

  test('resolves Forkbook with package exports and the import condition', () => {
    const result = withForkbook(config, { configPath: '/tmp/.rnforkbook', enabled: true });
    resolveRequest.mockClear();

    resolve(result, { base: true }, '@aussieljk/forkbook/react-native', 'ios');

    expect(resolveRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        base: true,
        unstable_enablePackageExports: true,
        unstable_conditionNames: ['import'],
      }),
      '@aussieljk/forkbook/react-native',
      'ios'
    );
  });

  test('removes Storybook modules when storybook is disabled', () => {
    const result = withForkbook(config, { configPath: '/tmp/.rnforkbook', enabled: false });

    expect(resolve(result, {}, '@aussieljk/forkbook/react-native', 'ios')).toEqual({
      type: 'empty',
    });
    expect(resolve(result, {}, '@storybook/react-native', 'ios')).toEqual({ type: 'empty' });
  });

  test('removes the full UI in lite mode', () => {
    const result = withForkbook(config, {
      configPath: '/tmp/.rnforkbook',
      enabled: true,
      liteMode: true,
    });

    expect(resolve(result, {}, '@aussieljk/forkbook/react-native-ui', 'ios')).toEqual({
      type: 'empty',
    });
  });
});
