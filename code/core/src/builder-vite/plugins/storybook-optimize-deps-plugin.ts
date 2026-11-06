import { loadPreviewOrConfigFile, normalizeStories } from '@aussieljk/forkbook/internal/common';
import {
  babelParser,
  extractMockCalls,
  findMockRedirect,
} from '@aussieljk/forkbook/internal/mocking-utils';
import type {
  NormalizedStoriesSpecifier,
  Options,
  PreviewAnnotation,
  StoriesEntry,
} from '@aussieljk/forkbook/internal/types';

import { resolve } from 'pathe';
import { type Plugin } from 'vite';

import { processPreviewAnnotation } from '../utils/process-preview-annotation.ts';

/**
 * Escapes special glob characters in a file path so Vite's dep optimizer treats it as a literal
 * path rather than a glob pattern. This is necessary for paths containing characters like `(` and
 * `)` (e.g. Next.js route group directories such as `src/(group)/...`) which would otherwise be
 * interpreted as extglob patterns by fast-glob.
 */
export function escapeGlobPath(filePath: string): string {
  return filePath.replace(/[()[\]{}!*?|+@]/g, '\\$&');
}

/** Converts extracted sb.mock calls into optimizeDeps include entries for manual **mocks** files. */
export function getMockRedirectIncludeEntries(
  mockCalls: Array<{ redirectPath: string | null }>
): string[] {
  return Array.from(
    new Set(
      mockCalls
        .map((mockCall) => mockCall.redirectPath)
        .filter((redirectPath): redirectPath is string => redirectPath !== null)
        .map(escapeGlobPath)
    )
  );
}

/**
 * Converts the `stories` specifiers into absolute globs for the dep optimizer. The directory is
 * escaped, so special characters in it are literal. The `files` part stays a glob.
 */
export function getStoryGlobEntries(
  specifiers: NormalizedStoriesSpecifier[],
  workingDir: string
): string[] {
  return specifiers.map(
    ({ directory, files }) => `${escapeGlobPath(resolve(workingDir, directory))}/${files}`
  );
}

/** A Vite plugin that configures dependency optimization for Forkbook's dev server. */
export function storybookOptimizeDepsPlugin(options: Options): Plugin {
  return {
    name: 'forkbook:optimize-deps-plugin',
    async config(config, { command }) {
      // optimizeDeps only applies to the dev server, not production builds
      if (command !== 'serve') {
        return;
      }

      const projectRoot = resolve(options.configDir, '..');

      // Use the `stories` globs, not the story index. The index reads every story file, and the
      // dev server must not wait for it before Vite starts. The globs give the same files.
      const [extraOptimizeDeps, stories, previewAnnotations] = await Promise.all([
        options.presets.apply<string[]>('optimizeViteDeps', []),
        options.presets.apply<StoriesEntry[]>('stories', []),
        options.presets.apply<PreviewAnnotation[]>('previewAnnotations', [], options),
      ]);
      const workingDir = process.cwd();
      const storyGlobEntries = stories.length
        ? getStoryGlobEntries(
            normalizeStories(stories, { configDir: options.configDir, workingDir }),
            workingDir
          )
        : [];

      // Include the user's preview file and all addon/framework/renderer preview annotations
      // as optimizer entries so Vite can discover all transitive CJS dependencies automatically.
      const previewOrConfigFile = loadPreviewOrConfigFile({ configDir: options.configDir });

      const mockRedirectIncludeEntries = previewOrConfigFile
        ? getMockRedirectIncludeEntries(
            extractMockCalls(
              {
                previewConfigPath: previewOrConfigFile,
                coreOptions: { disableTelemetry: true },
                configDir: options.configDir,
              },
              babelParser,
              projectRoot,
              findMockRedirect
            )
          )
        : [];

      const previewAnnotationEntries = [...previewAnnotations, previewOrConfigFile]
        .filter((path): path is PreviewAnnotation => path !== undefined)
        .map((path) => processPreviewAnnotation(path, projectRoot));

      return {
        optimizeDeps: {
          // Story files + preview annotation files as entry points for the dep optimizer.
          // Vite will crawl these to discover all transitive CJS dependencies that need
          // pre-bundling, removing the need for a hard-coded include list.
          // Paths are escaped so that special glob characters (e.g. parentheses in Next.js route
          // group directories) are treated as literal characters, not glob syntax.
          entries: [
            ...(typeof config.optimizeDeps?.entries === 'string'
              ? [config.optimizeDeps.entries]
              : (config.optimizeDeps?.entries ?? [])),
            ...mockRedirectIncludeEntries,
            ...storyGlobEntries,
            ...previewAnnotationEntries.map(escapeGlobPath),
          ],
          // Extra deps explicitly included by Forkbook presets (e.g. framework-specific packages).
          include: [...extraOptimizeDeps, ...(config.optimizeDeps?.include ?? [])],
        },
      };
    },
  };
}
