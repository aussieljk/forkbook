import { dedent } from 'ts-dedent';
import { StorybookError } from '../../storybook-error.ts';
import { Category } from './category.ts';

export class FindPackageVersionsError extends StorybookError {
  constructor(
    public data: { error: Error | unknown; packageName: string; packageManager: string }
  ) {
    super({
      name: 'FindPackageVersionsError',
      category: Category.CLI,
      code: 1,
      message: dedent`
        Unable to find versions of "${data.packageName}" using ${data.packageManager}
        ${data.error && `Reason: ${data.error}`}`,
    });
  }
}

export type ExecaCommandErrorData = {
  command: string;
  args: string[];
  exitCode?: number | string;
  signal?: string;
  logs: string;
  packageManagerErrorCode?: string;
};

export function formatExecaCommand(data: Pick<ExecaCommandErrorData, 'command' | 'args'>) {
  return [data.command, ...data.args].join(' ');
}

export function formatExecaFailureDetails(data: ExecaCommandErrorData) {
  const trimmedLogs = data.logs.trim();

  if (trimmedLogs) {
    return trimmedLogs;
  }

  if (data.exitCode != null) {
    return `Process exited with code ${data.exitCode}`;
  }

  if (data.signal) {
    return `Process was killed with signal ${data.signal}`;
  }

  return 'No additional output was captured.';
}

function createExecaCommandFailedMessage(data: ExecaCommandErrorData) {
  return dedent`
    Command failed: ${formatExecaCommand(data)}

    ${formatExecaFailureDetails(data)}`;
}

export class ExecaCommandFailedError extends StorybookError {
  constructor(public data: ExecaCommandErrorData & { cause?: unknown }) {
    super({
      name: 'ExecaCommandFailedError',
      category: Category.CLI,
      code: 3,
      cause: data.cause,
      message: createExecaCommandFailedMessage(data),
    });
  }
}

export class PackageInstallFailedError extends StorybookError {
  constructor(public data: ExecaCommandErrorData & { cause?: unknown }) {
    super({
      name: 'PackageInstallFailedError',
      category: Category.CLI_INIT,
      code: 10,
      cause: data.cause,
      message: dedent`
        Failed to install dependencies using ${data.command}.

        ${formatExecaFailureDetails(data)}`,
    });
  }
}

export class PackageInstallDependencyConflictError extends StorybookError {
  constructor(public data: ExecaCommandErrorData & { cause?: unknown }) {
    super({
      name: 'PackageInstallDependencyConflictError',
      category: Category.CLI_INIT,
      code: 11,
      cause: data.cause,
      message: dedent`
        Dependency installation failed because of a version conflict.

        ${formatExecaFailureDetails(data)}`,
    });
  }
}

export class PackageInstallMissingManifestError extends StorybookError {
  constructor(public data: ExecaCommandErrorData & { cause?: unknown }) {
    super({
      name: 'PackageInstallMissingManifestError',
      category: Category.CLI_INIT,
      code: 12,
      cause: data.cause,
      message: dedent`
        Dependency installation failed because no package.json was found in the current directory.

        ${formatExecaFailureDetails(data)}`,
    });
  }
}

export class PnpmIgnoredBuildsError extends StorybookError {
  constructor(public data: ExecaCommandErrorData & { cause?: unknown }) {
    super({
      name: 'PnpmIgnoredBuildsError',
      category: Category.CLI_INIT,
      code: 13,
      cause: data.cause,
      message: dedent`
        pnpm blocked postinstall scripts for one or more packages.

        ${formatExecaFailureDetails(data)}`,
    });
  }
}

export class PnpmNoTtyModulesDirError extends StorybookError {
  constructor(public data: ExecaCommandErrorData & { cause?: unknown }) {
    super({
      name: 'PnpmNoTtyModulesDirError',
      category: Category.CLI_INIT,
      code: 14,
      cause: data.cause,
      message: dedent`
        pnpm aborted while removing the modules directory because no TTY was available.

        ${formatExecaFailureDetails(data)}`,
    });
  }
}

export class PackageManagerBinaryNotFoundError extends StorybookError {
  constructor(public data: ExecaCommandErrorData & { cause?: unknown }) {
    super({
      name: 'PackageManagerBinaryNotFoundError',
      category: Category.CLI_INIT,
      code: 15,
      cause: data.cause,
      message: dedent`
        Forkbook could not find the "${data.command}" command on your PATH.

        ${formatExecaFailureDetails(data)}`,
    });
  }
}

export class PlaywrightInstallFailedError extends StorybookError {
  constructor(public data: ExecaCommandErrorData & { cause?: unknown }) {
    super({
      name: 'PlaywrightInstallFailedError',
      category: Category.CLI_INIT,
      code: 16,
      cause: data.cause,
      message: dedent`
        Failed to install Playwright browser binaries.

        ${formatExecaFailureDetails(data)}`,
    });
  }
}
