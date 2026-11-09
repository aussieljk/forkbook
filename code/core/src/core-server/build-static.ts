import { cp, mkdir } from 'node:fs/promises';
import { rm } from 'node:fs/promises';

import { Channel } from '@aussieljk/forkbook/internal/channels';
import {
  loadAllPresets,
  loadMainConfig,
  logConfig,
  resolveAddonName,
} from '@aussieljk/forkbook/internal/common';
import { logger } from '@aussieljk/forkbook/internal/node-logger';
import { telemetry } from '@aussieljk/forkbook/internal/telemetry';
import type {
  BuilderOptions,
  CLIOptions,
  LoadOptions,
  Options,
} from '@aussieljk/forkbook/internal/types';

import { global } from '../shared/global.ts';

import { join, relative, resolve } from 'pathe';
import picocolors from 'picocolors';

import {
  getRegisteredServices,
  writeOpenServiceStaticFiles,
} from '../shared/open-service/server.ts';
import { applyServicesPresetOnce } from './utils/apply-services-preset-once.ts';
import { resolvePackageDir } from '../shared/utils/module.ts';
import type { StoryIndexGenerator } from './utils/StoryIndexGenerator.ts';
import { buildOrThrow } from './utils/build-or-throw.ts';
import { copyAllStaticFilesRelativeToMain } from './utils/copy-all-static-files.ts';
import { getBuilders } from './utils/get-builders.ts';
import { writeIndexJson } from './utils/index-json.ts';
import { copyThumbnails } from './utils/thumbnails.ts';
import { resolveBasePath } from './utils/base-path.ts';
import { writeRoutePages } from './utils/write-route-pages.ts';
import { writeManifests } from './utils/manifests/manifests.ts';
import { outputStats } from './utils/output-stats.ts';
import { summarizeIndex } from './utils/summarizeIndex.ts';

export type BuildStaticStandaloneOptions = CLIOptions &
  LoadOptions &
  BuilderOptions & { outputDir?: string };

/** The default output folder of `forkbook build`. */
export const DEFAULT_STATIC_OUTPUT_DIR = './forkbook-static';

/**
 * Gives the output folder of the static build. An explicit `outputDir` has priority. With
 * `buildToPublic`, the build goes to `public<basePath>` (for example `public/_forkbook`).
 */
export function resolveStaticOutputDir({
  outputDir,
  buildToPublic,
  basePath,
}: {
  outputDir?: string;
  buildToPublic?: boolean;
  basePath: string;
}) {
  if (outputDir) {
    return outputDir;
  }
  if (buildToPublic) {
    if (!basePath) {
      // `public` itself would be removed before the build.
      throw new Error('buildToPublic needs a base path other than "/".');
    }
    return join('public', basePath);
  }
  return DEFAULT_STATIC_OUTPUT_DIR;
}

export async function buildStaticStandalone(options: BuildStaticStandaloneOptions) {
  options.configType = 'PRODUCTION';
  options.configDir = resolve(options.configDir);

  const config = await loadMainConfig(options);
  // `core` can also be a function. Its settings then come from the CLI or the defaults.
  const mainCore = typeof config.core === 'object' ? config.core : undefined;
  options.basePath = resolveBasePath(options.basePath, mainCore?.basePath);
  options.buildToPublic = options.buildToPublic ?? mainCore?.buildToPublic ?? false;
  const outputDir = resolveStaticOutputDir({
    outputDir: options.outputDir,
    buildToPublic: options.buildToPublic,
    basePath: options.basePath,
  });

  if (outputDir === '') {
    throw new Error("Won't remove current directory. Check your outputDir!");
  }

  const outputDirPath = resolve(outputDir);
  options.outputDir = outputDirPath;

  logger.step(`Cleaning outputDir: ${picocolors.cyan(relative(process.cwd(), outputDirPath))}`);
  if (outputDirPath === '/') {
    throw new Error("Won't remove directory '/'. Check your outputDir!");
  }
  await rm(outputDirPath, { recursive: true, force: true }).catch(() => {});
  await mkdir(outputDirPath, { recursive: true });

  const { framework } = config;
  const corePresets = [];

  const frameworkName = typeof framework === 'string' ? framework : framework?.name;
  if (frameworkName) {
    corePresets.push(join(frameworkName, 'preset'));
  } else {
    logger.warn(`you have not specified a framework in your ${options.configDir}/main.js`);
  }

  const commonPreset = join(
    resolvePackageDir('@aussieljk/forkbook'),
    'dist/core-server/presets/common-preset.js'
  );
  const commonOverridePreset = import.meta
    .resolve('@aussieljk/forkbook/internal/core-server/presets/common-override-preset');

  logger.step('Loading presets');

  // no-op channel, as it's only relevant in dev mode
  const channel = new Channel({});
  let presets = await loadAllPresets({
    corePresets: [commonPreset, ...corePresets],
    overridePresets: [commonOverridePreset],
    isCritical: true,
    channel,
    ...options,
  });

  const { renderer } = await presets.apply('core', {});
  const build = await presets.apply('build', {});
  const [previewBuilder, managerBuilder] = await getBuilders({
    ...options,
    presets,
    build,
    channel,
  });

  const resolvedRenderer = renderer
    ? resolveAddonName(options.configDir, renderer, options)
    : undefined;
  presets = await loadAllPresets({
    corePresets: [
      commonPreset,
      ...(managerBuilder.corePresets || []),
      ...(previewBuilder.corePresets || []),
      ...(resolvedRenderer ? [resolvedRenderer] : []),
      ...corePresets,
    ],
    overridePresets: [...(previewBuilder.overridePresets || []), commonOverridePreset],
    build,
    channel,
    ...options,
  });

  const [features, core, staticDirs] = await Promise.all([
    presets.apply('features'),
    presets.apply('core'),
    presets.apply('staticDirs'),
  ]);

  const invokedBy = process.env.FORKBOOK_INVOKED_BY;
  if (invokedBy) {
    // NOTE: we don't await this event to avoid slowing things down.
    // This could result in telemetry events being lost.
    telemetry('test-run', { runner: invokedBy, watch: false });
  }

  const fullOptions: Options = {
    ...options,
    channel,
    presets,
    features,
    build,
  };

  const effects: Promise<void>[] = [];

  global.FEATURES = features;
  await applyServicesPresetOnce(presets);

  if (!options.previewOnly) {
    await buildOrThrow(async () =>
      managerBuilder.build({ startTime: process.hrtime(), options: fullOptions })
    );
  }

  if (staticDirs) {
    effects.push(copyAllStaticFilesRelativeToMain(staticDirs, outputDirPath, options.configDir));
  }

  const coreServerPublicDir = join(resolvePackageDir('@aussieljk/forkbook'), 'assets/browser');
  effects.push(cp(coreServerPublicDir, outputDirPath, { recursive: true, force: true }));

  const hasRegisteredServices = getRegisteredServices().length > 0;
  const shouldWriteManifests = features?.componentsManifest;

  if (hasRegisteredServices || shouldWriteManifests) {
    effects.push(
      (async () => {
        if (hasRegisteredServices) {
          logger.info('Building open services..');
          await writeOpenServiceStaticFiles(outputDirPath);
        }

        if (shouldWriteManifests) {
          // Ref-based components.json reads docgen snapshots from outputDir/services/ — manifests
          // must run after open-service static files are written.
          await writeManifests(outputDirPath, presets);
        }
      })()
    );
  }

  const storyIndexGeneratorPromise = presets.apply<StoryIndexGenerator>('storyIndexGenerator');

  effects.push(writeIndexJson(join(outputDirPath, 'index.json'), storyIndexGeneratorPromise));

  if (!options.previewOnly) {
    // Each story URL gets its own copy of the manager page, so a static host serves deep links.
    effects.push(
      (async () => {
        const index = await (await storyIndexGeneratorPromise)?.getIndex();
        if (index) {
          await writeRoutePages(outputDirPath, index);
          await copyThumbnails(outputDirPath, index, process.cwd());
        }
      })()
    );
  }

  if (options.debugWebpack) {
    logConfig('Preview webpack config', await previewBuilder.getConfig(fullOptions));
  }

  logger.info('Building preview..');

  const startTime = process.hrtime();
  await Promise.all([
    previewBuilder
      .build({
        startTime,
        options: fullOptions,
      })
      .then(async (previewStats) => {
        logger.trace({ message: 'Preview built', time: process.hrtime(startTime) });

        const statsOption = options.statsJson;
        if (statsOption) {
          const target = statsOption === true ? outputDirPath : statsOption;
          await outputStats(target, previewStats || undefined);
        }
      })
      .catch((error) => {
        logger.error('Failed to build the preview');
        process.exitCode = 1;
        throw error;
      }),
    ...effects,
  ]);

  // Now the code has successfully built, we can count this as a 'build' event.
  // NOTE: we don't send the 'build' event for test runs as we want to be as fast as possible.
  if (!options.test) {
    try {
      const generator = await storyIndexGeneratorPromise;
      const storyIndex = await generator?.getIndex();
      await telemetry('build', storyIndex ? { storyIndex: summarizeIndex(storyIndex) } : {});
    } catch (e) {
      // Telemetry failures should not fail the build process
      logger.debug?.(`Build telemetry failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  logger.step(`Output directory: ${outputDirPath}`);
}
