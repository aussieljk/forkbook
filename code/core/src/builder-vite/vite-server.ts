import type { Options } from '@aussieljk/forkbook/internal/types';

import type { Server } from 'http';
import type { InlineConfig, ServerOptions } from 'vite';

import { getPublicClientPort } from './hmr-client-port.ts';
import { createViteLogger } from './logger.ts';
import { viteQueryFlagsPlugin } from './plugins/vite-query-flags-plugin.ts';
import { commonConfig } from './vite-config.ts';

/**
 * The HMR config for dev. A `server.hmr` from the user's Vite config wins. Else the client
 * connects to the public port from `PORTLESS_URL` or `FORKBOOK_PUBLIC_URL`, when one is set.
 */
export function getDevHmrConfig(
  userHmr: ServerOptions['hmr'],
  port: number | undefined,
  devServer: Server,
  env: NodeJS.ProcessEnv = process.env
): ServerOptions['hmr'] {
  if (userHmr !== undefined) {
    return userHmr;
  }
  const clientPort = getPublicClientPort(env);
  return { port, server: devServer, ...(clientPort ? { clientPort } : {}) };
}

export async function createViteServer(options: Options, devServer: Server) {
  const { presets } = options;

  const commonCfg = await commonConfig(options, 'development');

  const { allowedHosts } = await presets.apply('core', {});

  const config: InlineConfig & { server: ServerOptions } = {
    ...commonCfg,
    plugins: [viteQueryFlagsPlugin(), ...(commonCfg.plugins ?? [])],
    server: {
      allowedHosts,
      middlewareMode: true,
      hmr: getDevHmrConfig(commonCfg.server?.hmr, options.port, devServer),
      fs: {
        strict: true,
      },
    },
    appType: 'custom' as const,
  };

  // '0.0.0.0' binds to all interfaces, which is useful for Docker and other containerized environments
  if (
    options.host === '0.0.0.0' &&
    (!allowedHosts || (Array.isArray(allowedHosts) && allowedHosts.length === 0))
  ) {
    config.server.allowedHosts = true;
  }

  const finalConfig = await presets.apply('viteFinal', config, options);

  const { createServer } = await import('vite');

  finalConfig.customLogger ??= await createViteLogger();
  return createServer(finalConfig);
}
