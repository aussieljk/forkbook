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
  getForkbookPublicUrl,
  getPublicOrigin,
  normalizeNextBasePath,
  resolveNextConfig,
} from './config.ts';
import { type ForkbookServerHandle, ensureForkbookServer, waitForPort } from './server.ts';
import { forwardUpgrades } from './upgrade.ts';
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
  isLockStale,
  isPortOpen,
  isProcessAlive,
  readLock,
  resolveForkbookBin,
  waitForPort,
} from './server.ts';
export { forwardUpgrades, isUnderBasePath } from './upgrade.ts';
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
  /**
   * When true (the default), WebSocket upgrades under `basePath` (Vite HMR, the Forkbook channel)
   * go straight to the Forkbook server. See `./upgrade.ts`.
   */
  forwardWebSockets?: boolean;
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

/** The URLs that this process has logged. */
const announced = new Set<string>();

/** Logs `Forkbook: <url>` once per URL, when the port of the child answers. */
function announceWhenReady(
  port: number,
  publicUrl: string,
  child?: ForkbookServerHandle['child']
): void {
  if (announced.has(publicUrl)) {
    return;
  }
  announced.add(publicUrl);
  let exited = false;
  child?.once('exit', () => {
    exited = true;
  });
  void waitForPort(port, { stop: () => exited }).then((ready) => {
    if (ready) {
      console.log(`Forkbook: ${publicUrl}`);
    }
  });
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
        env: {
          ...process.env,
          FORKBOOK_PUBLIC_URL: getPublicOrigin(),
          ...(previewRoute && {
            FORKBOOK_NEXT_PROJECT_DIR: process.cwd(),
            FORKBOOK_NEXT_APP_DIR: previewRoute.appDir,
          }),
        },
      });
      destination = server.origin;
      if (!server.reused) {
        announceWhenReady(server.port, getForkbookPublicUrl(basePath), server.child);
      }
    }
    if (options.forwardWebSockets !== false) {
      forwardUpgrades(basePath, Number(new URL(destination).port));
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
