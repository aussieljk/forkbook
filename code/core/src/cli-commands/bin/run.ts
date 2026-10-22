import { globalSettings } from '@aussieljk/forkbook/internal/cli';
import {
  HandledError,
  JsPackageManagerFactory,
  PackageManagerName,
  optionalEnvToBoolean,
  removeAddon as remove,
  versions,
} from '@aussieljk/forkbook/internal/common';
import { withTelemetry } from '@aussieljk/forkbook/internal/core-server';
import { CLI_COLORS, logTracker, logger } from '@aussieljk/forkbook/internal/node-logger';
import { addToGlobalContext, telemetry } from '@aussieljk/forkbook/internal/telemetry';

import { Option, program } from 'commander';
import envinfo from 'envinfo';
import leven from 'leven';
import picocolors from 'picocolors';

import { version } from '../../../package.json';
import { add } from '../add.ts';
import { migrate } from '../migrate.ts';
import { pages } from '../pages.ts';

addToGlobalContext('cliVersion', versions['@aussieljk/forkbook']);

// Return a failed exit code but write the logs to a file first
const handleCommandFailure =
  (logFilePath: string | boolean | undefined) =>
  async (error: unknown): Promise<never> => {
    if (!(error instanceof HandledError)) {
      logger.error(String(error));
    }

    try {
      const logFile = await logTracker.writeToFile(logFilePath);
      logger.log(`Debug logs are written to: ${logFile}`);
    } catch {}
    logger.outro('');
    process.exit(1);
  };

const command = (name: string) =>
  program
    .command(name)
    .option(
      '--disable-telemetry',
      'Disable sending telemetry data',
      optionalEnvToBoolean(process.env.FORKBOOK_DISABLE_TELEMETRY)
    )
    .option('--debug', 'Get more logs in debug mode', false)
    .option('--enable-crash-reports', 'Enable sending crash reports to telemetry data')
    .option(
      '--logfile [path]',
      'Write all debug logs to the specified file at the end of the run. Defaults to debug-storybook.log when [path] is not provided'
    )
    .option('--loglevel <trace | debug | info | warn | error | silent>', 'Define log level', 'info')
    .hook('preAction', async (self) => {
      const options = self.opts();
      if (options.debug) {
        logger.setLogLevel('debug');
      }

      if (options.loglevel) {
        logger.setLogLevel(options.loglevel);
      }

      if (options.logfile) {
        logTracker.enableLogWriting();
      }

      try {
        await globalSettings();
      } catch (e) {
        logger.error('Error loading global settings:\n' + String(e));
      }
    })
    .hook('postAction', async (command) => {
      if (logTracker.shouldWriteLogsToFile) {
        try {
          const logFile = await logTracker.writeToFile(command.getOptionValue('logfile'));
          logger.log(`Debug logs are written to: ${logFile}`);
        } catch {}
        logger.outro(CLI_COLORS.success('Done!'));
      }
    });

command('init')
  .description('Initialize Forkbook into your project')
  .option('-f --force', 'Force add Forkbook')
  .option('-s --skip-install', 'Skip installing deps')
  .addOption(
    new Option('--package-manager <type>', 'Force package manager for installing deps').choices(
      Object.values(PackageManagerName)
    )
  )
  .option('-t --type <type>', 'Add Forkbook for a specific project type')
  .option('-y --yes', 'Answer yes to all prompts')
  .option('--dev', 'Launch the development server after completing initialization')
  .option(
    '--no-dev',
    'Do not launch the Forkbook development server after completing initialization (default)'
  );

command('add <addon>')
  .description('Add an addon to your Forkbook')
  .addOption(
    new Option('--package-manager <type>', 'Force package manager for installing deps').choices(
      Object.values(PackageManagerName)
    )
  )
  .option('-c, --config-dir <dir-name>', 'Directory where to load Forkbook configurations from')
  .option('--skip-install', 'Skip installing deps')
  .option('-s --skip-postinstall', 'Skip package specific postinstall config modifications')
  .option('-y --yes', 'Skip prompting the user')
  .action((addonName: string, options: any) => {
    withTelemetry('add', { cliOptions: options }, async () => {
      logger.intro(`Setting up your project for ${addonName}`);

      await add(addonName, options);

      await telemetry('add', { addon: addonName, source: 'cli' });
      logger.outro('Done!');
    }).catch(handleCommandFailure);
  });

command('remove <addon>')
  .description('Remove an addon from your Forkbook')
  .addOption(
    new Option('--package-manager <type>', 'Force package manager for installing deps').choices(
      Object.values(PackageManagerName)
    )
  )
  .option('-c, --config-dir <dir-name>', 'Directory where to load Forkbook configurations from')
  .option('-s --skip-install', 'Skip installing deps')
  .action((addonName: string, options: any) =>
    withTelemetry('remove', { cliOptions: options }, async () => {
      logger.intro(`Removing ${addonName} from your Forkbook`);
      const packageManager = JsPackageManagerFactory.getPackageManager({
        configDir: options.configDir,
        force: options.packageManager,
      });
      await remove(addonName, {
        configDir: options.configDir,
        packageManager,
        skipInstall: options.skipInstall,
      });
      await telemetry('remove', { addon: addonName, source: 'cli' });
      logger.outro('Done!');
    }).catch(handleCommandFailure(options.logfile))
  );

command('migrate')
  .description('Move a Storybook project to Forkbook')
  .option('--dry-run', 'Print the changes, but do not write them')
  .action(async (options: { dryRun?: boolean }) => {
    const result = await migrate({ dryRun: options.dryRun, version: String(version) });
    const verb = options.dryRun ? 'Would change' : 'Changed';
    logger.log(`Removed packages: ${result.removedPackages.join(', ') || 'none'}`);
    logger.log(`Added package: ${result.addedPackage}`);
    logger.log(`${verb} ${result.changedFiles.length} files:`);
    for (const file of result.changedFiles) {
      logger.log(`  ${file}`);
    }
    logger.log(`Now run ${picocolors.bold(result.installCommand)}, then read the diff.`);
  });

command('pages')
  .description('Write a story for each Next.js App Router page (also `init --pages`)')
  .option('--dry-run', 'Print the files, but do not write them')
  .action(async (options: { dryRun?: boolean }) => {
    const result = await pages({ dryRun: options.dryRun });
    for (const file of [result.helper, ...result.written].filter(Boolean)) {
      logger.log(`${options.dryRun ? 'Would write' : 'Wrote'} ${file}`);
    }
    for (const file of result.skipped) {
      logger.log(`Skipped ${file} (redirect only)`);
    }
  });

command('info')
  .description('Prints debugging information about the local environment')
  .action(async () => {
    logger.log(picocolors.bold('\nStorybook Environment Info:'));
    const pkgManager = JsPackageManagerFactory.getPackageManager();
    const activePackageManager = pkgManager.type.replace(/\d/, ''); // 'yarn1' -> 'yarn'
    const output = await envinfo.run({
      System: ['OS', 'CPU', 'Shell'],
      Binaries: ['Node', 'Bun', 'Yarn', 'npm', 'pnpm'],
      Browsers: ['Chrome', 'Edge', 'Firefox', 'Safari'],
      npmPackages: '{@storybook/*,*storybook*,sb,chromatic}',
      npmGlobalPackages: '{@storybook/*,*storybook*,sb,chromatic}',
    });
    const activePackageManagerLine = output.match(new RegExp(`${activePackageManager}:.*`, 'i'));
    logger.log(
      output.replace(
        activePackageManagerLine,
        picocolors.bold(`${activePackageManagerLine} <----- active`)
      )
    );
  });

program.on('command:*', ([invalidCmd]) => {
  let errorMessage = ` Invalid command: ${picocolors.bold(invalidCmd)}.\n See --help for a list of available commands.`;
  const availableCommands = program.commands.map((cmd) => cmd.name());
  const suggestion = availableCommands.find((cmd) => leven(cmd, invalidCmd) < 3);
  if (suggestion) {
    errorMessage += `\n Did you mean ${picocolors.yellow(suggestion)}?`;
  }
  logger.error(errorMessage);
  process.exit(1);
});

program.usage('<command> [options]').version(String(version)).parse(process.argv);
