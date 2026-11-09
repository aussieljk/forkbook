/**
 * Pure helpers that change a Next.js config for Forkbook. They do not start processes or touch the
 * file system, so later steps (for example the virtual preview route of builder-next) can compose
 * them.
 */
import { joinBasePath, normalizeBasePath } from '../channels/base-path.ts';

/** The Next.js phase of `next dev`. Forkbook is only active in this phase. */
export const PHASE_DEVELOPMENT_SERVER = 'phase-development-server';

export interface NextRewrite {
  source: string;
  destination: string;
  basePath?: false;
  locale?: false;
  has?: unknown[];
  missing?: unknown[];
}

export interface NextRewriteGroups {
  beforeFiles: NextRewrite[];
  afterFiles: NextRewrite[];
  fallback: NextRewrite[];
}

export type NextRewritesResult = NextRewrite[] | Partial<NextRewriteGroups>;

/** The part of the Next.js config that Forkbook reads or changes. Other keys pass through. */
export interface NextConfigObject {
  rewrites?: () => NextRewritesResult | Promise<NextRewritesResult>;
  skipTrailingSlashRedirect?: boolean;
  allowedDevOrigins?: string[];
  [key: string]: unknown;
}

export type NextConfigFunction = (
  phase: string,
  context: { defaultConfig: NextConfigObject; [key: string]: unknown }
) => NextConfigObject | Promise<NextConfigObject>;

export type NextConfigInput = NextConfigObject | NextConfigFunction;

/** Gives a base path for Next.js. The root (`''`) is not allowed: it would hide the app. */
export function normalizeNextBasePath(basePath: string | undefined): string {
  const base = normalizeBasePath(basePath);
  if (!base) {
    throw new Error('withForkbook: basePath must not be "/". Use a path such as "/_forkbook".');
  }
  return base;
}

/**
 * The rewrites that send `<base>` and `<base>/*` to the Forkbook server. The Forkbook server mounts
 * everything under the same base path, so the destination keeps it.
 *
 * @param destination The origin of the Forkbook server, for example `http://127.0.0.1:6006`.
 * @param exclude Path segments under the base path that Next.js serves itself, for example
 *   `['iframe']` for the builder-next preview route. `<base>/iframe` and `<base>/iframe/*` then
 *   do not go to Forkbook. `<base>/iframe.html` still does.
 */
export function getForkbookRewrites(
  basePath: string,
  destination: string,
  exclude: string[] = []
): NextRewrite[] {
  const base = normalizeNextBasePath(basePath);
  const origin = destination.replace(/\/+$/, '');
  if (exclude.length === 0) {
    return [
      { source: base, destination: `${origin}${joinBasePath(base)}` },
      { source: `${base}/:path*`, destination: `${origin}${base}/:path*` },
    ];
  }
  const names = exclude.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return [
    { source: base, destination: `${origin}${joinBasePath(base)}` },
    {
      // path-to-regexp: a parameter with a pattern. The lookahead skips the excluded segments.
      source: `${base}/:path((?!(?:${names})(?:/|$)).*)`,
      destination: `${origin}${base}/:path`,
    },
  ];
}

/** Puts the Forkbook rewrites first in `beforeFiles`, before the rewrites of the app. */
export function mergeRewrites(
  existing: NextRewritesResult | undefined,
  forkbook: NextRewrite[]
): NextRewriteGroups {
  if (Array.isArray(existing)) {
    // A plain array is the same as `afterFiles`.
    return { beforeFiles: [...forkbook], afterFiles: existing, fallback: [] };
  }
  return {
    beforeFiles: [...forkbook, ...(existing?.beforeFiles ?? [])],
    afterFiles: existing?.afterFiles ?? [],
    fallback: existing?.fallback ?? [],
  };
}

/**
 * The host names for `allowedDevOrigins`: the given hosts, the host of `PORTLESS_URL` and local
 * names. Next.js wants host names without a port.
 */
export function getSiteHosts(
  extraHosts: string[] = [],
  env: Record<string, string | undefined> = process.env
): string[] {
  const hosts = new Set<string>();
  const add = (value: string | undefined) => {
    if (!value) {
      return;
    }
    try {
      hosts.add(value.includes('://') ? new URL(value).hostname : value.split(':')[0]);
    } catch {
      // Not a URL. Ignore it.
    }
  };
  extraHosts.forEach(add);
  add(env.PORTLESS_URL);
  add('localhost');
  add('127.0.0.1');
  // portless and similar tools serve apps at `<name>.localhost`.
  add('*.localhost');
  return [...hosts];
}

export interface ForkbookDevConfigOptions {
  basePath: string;
  /** The origin of the Forkbook server, for example `http://127.0.0.1:6006`. */
  destination: string;
  siteHosts?: string[];
  /** See `getForkbookRewrites`. */
  excludeFromRewrites?: string[];
}

/**
 * Adds the dev settings to a Next.js config: the rewrites to the Forkbook server,
 * `skipTrailingSlashRedirect: true` (Next.js otherwise redirects `<base>/` and WebSocket paths in
 * a loop) and the site hosts in `allowedDevOrigins`. The input is not changed.
 */
export function applyForkbookDevConfig(
  config: NextConfigObject,
  { basePath, destination, siteHosts, excludeFromRewrites }: ForkbookDevConfigOptions
): NextConfigObject {
  const rewrites = getForkbookRewrites(basePath, destination, excludeFromRewrites);
  const userRewrites = config.rewrites;
  const allowedDevOrigins = [
    ...new Set([...(config.allowedDevOrigins ?? []), ...getSiteHosts(siteHosts)]),
  ];
  return {
    ...config,
    skipTrailingSlashRedirect: true,
    allowedDevOrigins,
    rewrites: async () => mergeRewrites(await userRewrites?.(), rewrites),
  };
}

/** Gives the config object from a Next.js config object or config function. */
export async function resolveNextConfig(
  input: NextConfigInput,
  phase: string,
  context: Parameters<NextConfigFunction>[1]
): Promise<NextConfigObject> {
  return typeof input === 'function' ? await input(phase, context) : input;
}
