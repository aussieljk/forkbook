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
import {
  PREVIEW_ROUTE_SEGMENT,
  type PreviewRoute,
  type PreviewRouteMocks,
  applyPreviewRouteMocks,
  removePreviewRoute,
  writePreviewRoute,
} from '../builder-next/route.ts';

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
export type { PreviewAlias, PreviewRoute, PreviewRouteMocks } from '../builder-next/route.ts';

export interface WithForkbookOptions {
  /** The URL path of Forkbook. Default: `/_forkbook`. */
  basePath?: string;
  /** The Forkbook config folder, from the project root. Default: `.forkbook`. */
  configDir?: string;
  /** The Forkbook project root (where `configDir` is). Default: `process.cwd()`. The preview route always goes in the Next.js project (`process.cwd()`). */
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
   * builder-next: Next.js serves the story preview at `<basePath>/iframe`. `withForkbook` writes
   * the route to `<app>/(forkbook)` (ignored through `.git/info/exclude`) and removes it when
   * `next dev` stops. The Forkbook server must use builder-next
   * (`core.builder: '@aussieljk/forkbook/builder-next'`).
   */
  enablePreviewRoute?: boolean;
  /**
   * The seam for `next/*` mocks of the preview route (phase 3). `resolveAlias` entries are added
   * to `turbopack.resolveAlias`. Only used with `enablePreviewRoute`.
   */
  previewMocks?: PreviewRouteMocks;
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
  /** The preview route folders, when `enablePreviewRoute` is set. */
  previewRoute?: PreviewRoute;
  options: WithForkbookOptions;
}

let removeOnExit: PreviewRoute | undefined;

/** Removes the preview route when `next dev` stops. Registered once per process. */
function removeRouteOnExit(route: PreviewRoute) {
  if (!removeOnExit) {
    const remove = () => removeOnExit && removePreviewRoute(removeOnExit);
    process.once('exit', remove);
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
      process.once(signal, () => {
        remove();
        process.exit(128 + (signal === 'SIGINT' ? 2 : signal === 'SIGTERM' ? 15 : 1));
      });
    }
  }
  removeOnExit = route;
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
    const cwd = options.cwd ?? process.cwd();

    let previewRoute: PreviewRoute | undefined;
    if (options.enablePreviewRoute) {
      previewRoute = writePreviewRoute({ projectDir: process.cwd(), basePath });
      removeRouteOnExit(previewRoute);
    }

    let server: ForkbookServerHandle | undefined;
    let destination: string;
    if (options.startServer === false) {
      if (!options.port) {
        throw new Error('withForkbook: set `port` when `startServer` is false.');
      }
      destination = `http://127.0.0.1:${options.port}`;
    } else {
      server = await ensureForkbookServer({
        cwd,
        basePath,
        configDir: options.configDir ?? '.forkbook',
        port: options.port,
        args: options.args,
        spawnServer: options.spawnServer,
        env: previewRoute
          ? {
              ...process.env,
              FORKBOOK_NEXT_PROJECT_DIR: process.cwd(),
              FORKBOOK_NEXT_APP_DIR: previewRoute.appDir,
            }
          : undefined,
      });
      destination = server.origin;
    }

    let devConfig = applyForkbookDevConfig(config, {
      basePath,
      destination,
      siteHosts: options.siteHosts,
      excludeFromRewrites: previewRoute ? [PREVIEW_ROUTE_SEGMENT] : undefined,
    });
    if (previewRoute && options.previewMocks) {
      devConfig = applyPreviewRouteMocks(devConfig, options.previewMocks, process.cwd());
    }
    return options.extendConfig
      ? options.extendConfig(devConfig, {
          phase,
          basePath,
          destination,
          server,
          previewRoute,
          options,
        })
      : devConfig;
  };
}

export default withForkbook;
