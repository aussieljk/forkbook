import { dedent } from 'ts-dedent';
import { StorybookError } from '../../storybook-error.ts';
import { Category } from './category.ts';

export class GenerateNewProjectOnInitError extends StorybookError {
  constructor(
    public data: { error: unknown | Error; packageManager: string; projectType: string }
  ) {
    super({
      name: 'GenerateNewProjectOnInitError',
      category: Category.CLI_INIT,
      code: 3,
      documentation: '',
      message: dedent`
        There was an error while using ${data.packageManager} to create a new ${
          data.projectType
        } project.
        
        ${data.error instanceof Error ? data.error.message : ''}`,
    });
  }
}

type MinimumReleaseAgeHandledErrorData =
  | {
      message: string;
      cause?: unknown;
    }
  | {
      packageManagerName: string;
      minimumReleaseAgeConfigName: string;
      minimumReleaseAgeConfigDocs: string;
      minimumReleaseAgeExclusionsConfigName?: string;
      minimumReleaseAgeExclusionsConfigDocs?: string;
      failedPackage?: string | null;
      cause?: unknown;
    };

function createMinimumReleaseAgeHandledErrorMessage(data: MinimumReleaseAgeHandledErrorData) {
  if ('message' in data) {
    return data.message;
  }

  const followUp = data.minimumReleaseAgeExclusionsConfigName
    ? `To fix this, either wait for the configured age window to pass and rerun the command, or add the blocked packages to ${data.packageManagerName}'s ${data.minimumReleaseAgeExclusionsConfigName} setting.`
    : 'To fix this, either wait for the configured age window to pass and rerun the command, or rerun Forkbook with an older compatible release.';

  return dedent`
    ${data.packageManagerName} blocked package installation because your project uses ${data.minimumReleaseAgeConfigName}.
    ${data.failedPackage ? `\nFailed package: ${data.failedPackage}\n` : ''}
    ${followUp}
  `;
}

export class MinimumReleaseAgeHandledError extends StorybookError {
  constructor(public data: MinimumReleaseAgeHandledErrorData) {
    super({
      name: 'MinimumReleaseAgeHandledError',
      category: Category.CLI,
      isHandledError: true,
      code: 2,
      cause: data.cause,
      message: createMinimumReleaseAgeHandledErrorMessage(data),
    });
  }
}

export class AddonVitestPostinstallPrerequisiteCheckError extends StorybookError {
  constructor(public data: { reasons: string[] }) {
    super({
      name: 'AddonVitestPostinstallPrerequisiteCheckError',
      category: Category.CLI_INIT,
      isHandledError: true,
      code: 4,
      documentation: '',
      message: 'The prerequisite check for the Vitest addon failed.',
    });
  }
}

export class AddonVitestPostinstallWorkspaceUpdateError extends StorybookError {
  constructor(public data: { filePath: string }) {
    super({
      name: 'AddonVitestPostinstallWorkspaceUpdateError',
      category: Category.CLI_INIT,
      isHandledError: true,
      code: 8,
      documentation: `https://forkbook.ljk.dev/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced`,
      message: dedent`
        Could not update existing Vitest workspace file: ${data.filePath}
        Please refer to the documentation to complete the setup manually.
      `,
    });
  }
}

export class AddonVitestPostinstallConfigUpdateError extends StorybookError {
  constructor(public data: { filePath: string }) {
    super({
      name: 'AddonVitestPostinstallConfigUpdateError',
      category: Category.CLI_INIT,
      isHandledError: true,
      code: 9,
      documentation: `https://forkbook.ljk.dev/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced`,
      message: dedent`
        Unable to update existing Vitest config file: ${data.filePath}
        Please refer to the documentation to complete the setup manually.
      `,
    });
  }
}

export class AddonVitestPostinstallError extends StorybookError {
  constructor(public data: { errors: StorybookError[] }) {
    super({
      name: 'AddonVitestPostinstallError',
      category: Category.CLI_INIT,
      isHandledError: true,
      code: 5,
      message: 'The Vitest addon setup failed.',
      subErrors: data.errors,
    });
  }
}
