import {
  type JsPackageManager,
  JsPackageManagerFactory,
  PackageManagerName,
  getPrettyPackageManagerName,
  resolveStorybookVersionSpecifier,
  isCI,
  invalidateProjectRootCache,
  warnOnYarn1,
  getProcessAncestry,
} from '@aussieljk/forkbook/internal/common';
import { CLI_COLORS, logger } from '@aussieljk/forkbook/internal/node-logger';
import { MinimumReleaseAgeHandledError } from '@aussieljk/forkbook/internal/server-errors';

import { dedent } from 'ts-dedent';

import type { CommandOptions } from '../generators/types.ts';
import { currentDirectoryIsEmpty, scaffoldNewProject } from '../scaffold-new-project.ts';
import { TelemetryService, VersionService } from '../services/index.ts';

export interface PreflightCheckResult {
  packageManager: JsPackageManager;
  isEmptyProject: boolean;
}

/**
 * Command for running preflight checks before Forkbook initialization
 *
 * Responsibilities:
 *
 * - Handle empty directory detection and scaffolding
 * - Initialize package manager
 * - Install base dependencies if needed
 */
export class PreflightCheckCommand {
  /** Execute preflight checks */
  constructor(
    private readonly versionService = new VersionService(),
    private readonly telemetryService = new TelemetryService()
  ) {}
  async execute(options: CommandOptions): Promise<PreflightCheckResult> {
    if (options.storybookVersionSpecifier === undefined) {
      try {
        options.storybookVersionSpecifier = resolveStorybookVersionSpecifier(getProcessAncestry());
      } catch {
        // Ignore ancestry lookup failures and fall back to the embedded release versions.
      }
    }

    const isEmptyDirProject = options.force !== true && currentDirectoryIsEmpty();
    let packageManagerType = JsPackageManagerFactory.getPackageManagerType();

    // Check if the current directory is empty
    if (isEmptyDirProject) {
      // Initializing Forkbook in an empty directory with yarn1
      // will very likely fail due to different kinds of hoisting issues
      // which doesn't get fixed anymore in yarn1.
      // We will fallback to npm in this case.
      if (
        options.packageManager
          ? options.packageManager === PackageManagerName.YARN1
          : packageManagerType === PackageManagerName.YARN1
      ) {
        logger.warn('Empty directory with yarn1 is unsupported. Falling back to npm.');
        packageManagerType = PackageManagerName.NPM;
        options.packageManager = packageManagerType;
      }

      // Prompt the user to create a new project from our list
      logger.intro(CLI_COLORS.info(`Initializing a new project`));
      await scaffoldNewProject(packageManagerType, this.telemetryService);
      logger.outro(CLI_COLORS.info(`Project created successfully`));
      invalidateProjectRootCache();
    }

    logger.intro(CLI_COLORS.info(`Initializing Forkbook`));

    const packageManager = JsPackageManagerFactory.getPackageManager({
      force: options.packageManager,
    });

    logger.info(`Package manager: ${getPrettyPackageManagerName(packageManager.type)}`);
    warnOnYarn1(packageManager.type);

    // Install base project dependencies if we scaffolded a new project
    if (isEmptyDirProject && !options.skipInstall) {
      await packageManager.installDependencies();
    }

    this.checkPackageNameConflict(packageManager);

    await this.displayVersionInfo(packageManager);
    try {
      await packageManager.precheckStorybookPackageInstall({
        storybookVersion: this.versionService.getCurrentVersion(),
        nonInteractive: !!options.yes || !process.stdout.isTTY || !!isCI(),
      });
    } catch (error) {
      if (error instanceof MinimumReleaseAgeHandledError) {
        throw error;
      }

      logger.debug(`Skipping minimum-release-age precheck after an unexpected failure: ${error}`);
    }

    return { packageManager, isEmptyProject: isEmptyDirProject };
  }

  /**
   * Warn when the project's package.json "name" is "@aussieljk/forkbook", which shadows
   * the real storybook package in workspaces.
   *
   * See: https://github.com/storybookjs/storybook/issues/28725
   */
  private checkPackageNameConflict(packageManager: JsPackageManager): void {
    const packageName = packageManager.primaryPackageJson.packageJson.name;

    if (packageName === '@aussieljk/forkbook') {
      logger.warn(dedent`
        Your package.json "name" field is set to "@aussieljk/forkbook".

        In npm, pnpm, or yarn workspaces this creates a symlink at
        node_modules/storybook that shadows the real Forkbook package,
        causing "Cannot find module @aussieljk/forkbook/internal/..." errors.

        Please rename the "name" field in your package.json to something
        other than "@aussieljk/forkbook" (e.g. "my-storybook", "docs", "@myorg/storybook").
      `);
    }
  }

  /** Display version information and warnings */
  private async displayVersionInfo(packageManager: JsPackageManager): Promise<void> {
    const { currentVersion, latestVersion, isPrerelease, isOutdated } =
      await this.versionService.getVersionInfo(packageManager);

    if (isOutdated && !isPrerelease) {
      logger.warn(dedent`
          This version is behind the latest release, which is: ${latestVersion}!
          You likely ran the init command through npx, which can use a locally cached version.
          
          To get the latest, please run: ${CLI_COLORS.cta('npx @aussieljk/forkbook@latest init')}
          You may want to ${CLI_COLORS.cta('CTRL+C')} to stop, and run with the latest version instead.
        `);
    } else if (isPrerelease) {
      logger.warn(`This is a pre-release version: ${currentVersion}`);
    } else {
      logger.info(`Adding Forkbook version ${currentVersion} to your project`);
    }
  }
}

export const executePreflightCheck = async (
  options: CommandOptions
): Promise<PreflightCheckResult> => {
  const command = new PreflightCheckCommand();
  return command.execute(options);
};
