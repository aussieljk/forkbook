/**
 * builder-next: the preview builder for `forkbook dev` when `next dev` serves the preview.
 *
 * It does not bundle anything. Next.js (Turbopack) builds the preview route that `withForkbook`
 * writes to `<app>/(forkbook)`. This builder runs in the Forkbook server and:
 *
 * - writes the story loader module and the project annotations module into that route, and writes
 *   the loader again when a story file is added or removed, so Turbopack hot reloads it;
 * - serves `<base>/iframe-globals.json` (the globals that `iframe.html` sets for builder-vite);
 * - sends `<base>/iframe.html` to `<base>/iframe`, the route that Next.js serves, so the manager
 *   needs no change.
 *
 * `forkbook build` and the Vitest story tests still use builder-vite.
 */
import { join } from 'node:path';

import { loadPreviewOrConfigFile, normalizeStories } from '@aussieljk/forkbook/internal/common';
import type {
  Builder,
  DocsOptions,
  Options,
  PreviewAnnotation,
  SecurityConfig,
  StoryIndex,
  TagsOptions,
} from '@aussieljk/forkbook/internal/types';

import { joinBasePath, normalizeBasePath } from '../channels/base-path.ts';
import {
  PREVIEW_GLOBALS_PATH,
  PREVIEW_ROUTE_FILES,
  PREVIEW_ROUTE_SEGMENT,
  type PreviewRoute,
  generateAnnotationsCode,
  generateStoryLoaderCode,
  resolvePreviewRoute,
  writeIfChanged,
  writePreviewRoute,
} from './route.ts';

export * from './route.ts';

/** The environment variables that `withForkbook` gives to the Forkbook child. */
export const BUILDER_NEXT_ENV = {
  /** The Next.js project folder. Default: the working folder of the Forkbook server. */
  projectDir: 'FORKBOOK_NEXT_PROJECT_DIR',
  /** The app folder of the Next.js project. Default: found from the project folder. */
  appDir: 'FORKBOOK_NEXT_APP_DIR',
} as const;

/**
 * The seam for `next/*` mocks (phase 3). A mocks approach adds preview annotation files (for
 * example a decorator that wraps each story in Next.js context providers). Module mocks are set
 * on the Next.js side (`previewMocks` of `withForkbook`). `applyPreviewRouteMocks` scopes them to
 * the story graph with a `turbopack.rules` loader, not the global `turbopack.resolveAlias`.
 */
export interface BuilderNextMocks {
  /** Absolute paths or package names, added after the framework annotations. */
  previewAnnotations?: string[];
}

export interface BuilderNextOptions {
  mocks?: BuilderNextMocks;
}

type ServerApp = Parameters<Builder<unknown>['start']>[0]['router'];

/** The globals that `iframe.html` of builder-vite sets, as one object. */
export async function getPreviewGlobals(options: Options): Promise<Record<string, unknown>> {
  const { configType, features, presets } = options;
  const [build, frameworkOptions, logLevel, docsOptions, tagsOptions, security, coreOptions] =
    await Promise.all([
      presets.apply<{ test?: { disableBlocks?: boolean } } | undefined>('build'),
      presets.apply<Record<string, unknown> | null>('frameworkOptions'),
      presets.apply<string | undefined>('logLevel', undefined),
      presets.apply<DocsOptions>('docs'),
      presets.apply<TagsOptions>('tags'),
      presets.apply<SecurityConfig | undefined>('security'),
      presets.apply<{ channelOptions?: Record<string, unknown> } | undefined>('core'),
    ]);
  const stories = normalizeStories(await presets.apply('stories', [], options), {
    configDir: options.configDir,
    workingDir: process.cwd(),
  }).map((specifier) => ({
    ...specifier,
    importPathMatcher: specifier.importPathMatcher.source,
  }));
  return {
    CONFIG_TYPE: configType ?? '',
    LOGLEVEL: logLevel ?? '',
    FRAMEWORK_OPTIONS: frameworkOptions ?? null,
    CHANNEL_OPTIONS: coreOptions?.channelOptions ?? {},
    FEATURES: features ?? {},
    STORIES: stories,
    DOCS_OPTIONS: docsOptions ?? {},
    TAGS_OPTIONS: tagsOptions ?? {},
    ...(build?.test?.disableBlocks ? { __FORKBOOK_BLOCKS_EMPTY_MODULE__: {} } : {}),
    ...(security?.insecureIframeMessaging ? { INSECURE_IFRAME_MESSAGING: true } : {}),
  };
}

/**
 * The preview of the `nextjs-vite` framework needs the Vite aliases of `nextjs-vite-plugin`
 * (`fb-original/*`, `next/*` mocks). Next.js does not have them, so builder-next leaves it out.
 * Phase 3 gives the `next/*` mocks back through `BuilderNextMocks`.
 */
export function isViteOnlyAnnotation(path: string): boolean {
  return (
    /[\\/]nextjs-vite[\\/]preview\.(?:js|mjs|tsx?)$/.test(path) ||
    path === '@aussieljk/forkbook/nextjs-vite/preview'
  );
}

/** The preview annotation files as absolute paths or package names, project preview last. */
export async function getPreviewAnnotationPaths(
  options: Options,
  mocks: BuilderNextMocks = {}
): Promise<string[]> {
  const annotations = await options.presets.apply<PreviewAnnotation[]>(
    'previewAnnotations',
    [],
    options
  );
  const previewFile = loadPreviewOrConfigFile({ configDir: options.configDir });
  const paths = annotations
    .map((annotation) => (typeof annotation === 'object' ? annotation.absolute : annotation))
    .filter((path) => !isViteOnlyAnnotation(path));
  return [...paths, ...(mocks.previewAnnotations ?? []), ...(previewFile ? [previewFile] : [])];
}

/** Redirects `<base>/iframe.html?…` to `<base>/iframe?…`, the route that Next.js serves. */
export function getIframeRedirectUrl(basePath: string, url: string | undefined): string {
  const query = url?.includes('?') ? url.slice(url.indexOf('?')) : '';
  return `${joinBasePath(basePath, PREVIEW_ROUTE_SEGMENT)}${query}`;
}

let unsubscribe: (() => void) | undefined;

export interface StoryLoaderWriter {
  route: PreviewRoute;
  /** Writes the loader module from the index. Returns true when the file changed. */
  writeStories(index: Pick<StoryIndex, 'entries'>): boolean;
  /** Writes the annotations module. Returns true when the file changed. */
  writeAnnotations(paths: string[]): boolean;
}

/** Writes the generated loader modules of the preview route. */
export function createStoryLoaderWriter({
  projectDir,
  appDir,
  basePath,
  workingDir,
}: {
  projectDir: string;
  appDir?: string;
  basePath: string;
  workingDir: string;
}): StoryLoaderWriter {
  const route = resolvePreviewRoute({ projectDir, appDir, basePath });
  return {
    route,
    writeStories: (index) =>
      writeIfChanged(
        join(route.routeDir, PREVIEW_ROUTE_FILES.stories),
        generateStoryLoaderCode(index.entries, { workingDir, routeDir: route.routeDir })
      ),
    writeAnnotations: (paths) =>
      writeIfChanged(
        join(route.routeDir, PREVIEW_ROUTE_FILES.annotations),
        generateAnnotationsCode(paths, route.routeDir)
      ),
  };
}

function registerRoutes(router: ServerApp, basePath: string, options: Options) {
  router.get('/iframe.html', (req, res) => {
    res.statusCode = 302;
    res.setHeader('Location', getIframeRedirectUrl(basePath, req.url));
    res.end();
  });
  router.get(PREVIEW_GLOBALS_PATH, async (_req, res) => {
    try {
      const globals = await getPreviewGlobals(options);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(globals));
    } catch (error) {
      res.statusCode = 500;
      res.end(String(error));
    }
  });
}

export const bail: Builder<unknown>['bail'] = async () => {
  unsubscribe?.();
  unsubscribe = undefined;
};

export const getConfig: Builder<unknown>['getConfig'] = async () => ({});

export const start: Builder<unknown>['start'] = async ({ startTime, options, router }) => {
  const basePath = normalizeBasePath(options.basePath) || '/_forkbook';
  const workingDir = process.cwd();
  const projectDir = process.env[BUILDER_NEXT_ENV.projectDir] || workingDir;
  const appDir = process.env[BUILDER_NEXT_ENV.appDir] || undefined;
  const frameworkOptions = await options.presets.apply<{ builderNext?: BuilderNextOptions } | null>(
    'frameworkOptions'
  );
  const mocks = frameworkOptions?.builderNext?.mocks;

  // Write the static files too, for `forkbook dev --builder next` without `withForkbook`.
  writePreviewRoute({ projectDir, appDir, basePath });
  const writer = createStoryLoaderWriter({ projectDir, appDir, basePath, workingDir });
  registerRoutes(router, basePath, options);

  writer.writeAnnotations(await getPreviewAnnotationPaths(options, mocks));
  const generator = await options.presets.apply<{
    getIndex(): Promise<StoryIndex>;
    onInvalidated(listener: (event?: { added: boolean; removed: boolean }) => void): () => void;
  }>('storyIndexGenerator');
  const writeIndex = async () => {
    try {
      writer.writeStories(await generator.getIndex());
    } catch {
      // The index has an error. The manager shows it. Keep the last loader.
    }
  };
  await writeIndex();
  unsubscribe?.();
  unsubscribe = generator.onInvalidated((event) => {
    // An edit of a story file keeps the same import paths. Next.js hot reloads that file itself.
    if (event && !event.added && !event.removed) {
      return;
    }
    void writeIndex();
  });

  return { bail, totalTime: process.hrtime(startTime) };
};

export const build: Builder<unknown>['build'] = async () => {
  throw new Error(
    'builder-next only runs `forkbook dev`. `forkbook build` uses builder-vite (@aussieljk/forkbook/builder-vite).'
  );
};
