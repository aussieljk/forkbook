/**
 * `withForkbook` for `next.config`. In `next dev` it starts the Forkbook server as a child process
 * and sends `<basePath>` and `<basePath>/*` to it with rewrites, so the app and Forkbook share one
 * host and port.
 *
 * ```ts
 * // next.config.ts
 * import { withForkbook } from '@aussieljk/forkbook/next';
 *
 * export default withForkbook({ reactStrictMode: true });
 * ```
 */
import { DEFAULT_BASE_PATH } from '../channels/base-path.ts';
import {
  type NextConfigFunction,
  type NextConfigInput,
  type NextConfigObject,
  PHASE_DEVELOPMENT_SERVER,
  applyForkbookDevConfig,
  normalizeNextBasePath,
  resolveNextConfig,
} from './config.ts';
import { type ForkbookServerHandle, ensureForkbookServer } from './server.ts';

export * from './config.ts';
export {
  type ForkbookLock,
  type ForkbookServerHandle,
  type ForkbookServerOptions,
  ensureForkbookServer,
  findFreePort,
  getForkbookDevArgs,
  getLockPath,
  isProcessAlive,
  readLock,
  resolveForkbookBin,
} from './server.ts';
export { DEFAULT_BASE_PATH };

export interface WithForkbookOptions {
  /** The URL path of Forkbook. Default: `/_forkbook`. */
  basePath?: string;
  /** The Forkbook config folder, from the project root. Default: `.forkbook`. */
  configDir?: string;
  /** The project root. Default: `process.cwd()`. */
  cwd?: string;
  /** The port of the Forkbook server. Default: `FORKBOOK_PORT`, else a free port that is not `PORT`. */
  port?: number;
  /** More host names for `allowedDevOrigins`. The host of `PORTLESS_URL` is added by itself. */
  siteHosts?: string[];
  /** More arguments for `forkbook dev`. */
  args?: string[];
  /**
   * When false, no child is started. The rewrites go to `port` (which must then be set), for a
   * Forkbook that runs on its own.
   */
  startServer?: boolean;
  /**
   * Reserved for builder-next: serve the story preview from a virtual Next.js route at
   * `<basePath>/iframe`. Phase 0 does not use it. Pass it to `extendConfig` code.
   */
  enablePreviewRoute?: boolean;
  /**
   * Changes the dev config after Forkbook has added its settings, for example to add the preview
   * route or `turbopack.resolveAlias` entries.
   */
  extendConfig?: (
    config: NextConfigObject,
    context: ForkbookNextContext
  ) => NextConfigObject | Promise<NextConfigObject>;
  /** Replaces the start of the child. Tests use it. */
  spawnServer?: Parameters<typeof ensureForkbookServer>[0]['spawnServer'];
}

export interface ForkbookNextContext {
  phase: string;
  basePath: string;
  /** The origin of the Forkbook server, for example `http://127.0.0.1:6006`. */
  destination: string;
  server?: ForkbookServerHandle;
  options: WithForkbookOptions;
}

/**
 * Wraps a Next.js config (object or function). Only `next dev` (phase
 * `phase-development-server`) changes. Other phases get the config as it is.
 */
export function withForkbook(
  nextConfig: NextConfigInput = {},
  options: WithForkbookOptions = {}
): NextConfigFunction {
  return async (phase, context) => {
    const config = await resolveNextConfig(nextConfig, phase, context);
    // Inside the Forkbook child (for example when a preset loads next.config), do nothing. This
    // stops a loop of children.
    if (phase !== PHASE_DEVELOPMENT_SERVER || process.env.FORKBOOK_PARENT_PID) {
      return config;
    }
    const basePath = normalizeNextBasePath(options.basePath ?? DEFAULT_BASE_PATH);

    let server: ForkbookServerHandle | undefined;
    let destination: string;
    if (options.startServer === false) {
      if (!options.port) {
        throw new Error('withForkbook: set `port` when `startServer` is false.');
      }
      destination = `http://127.0.0.1:${options.port}`;
    } else {
      server = await ensureForkbookServer({
        cwd: options.cwd ?? process.cwd(),
        basePath,
        configDir: options.configDir ?? '.forkbook',
        port: options.port,
        args: options.args,
        spawnServer: options.spawnServer,
      });
      destination = server.origin;
    }

    const devConfig = applyForkbookDevConfig(config, {
      basePath,
      destination,
      siteHosts: options.siteHosts,
    });
    return options.extendConfig
      ? options.extendConfig(devConfig, { phase, basePath, destination, server, options })
      : devConfig;
  };
}

export default withForkbook;
