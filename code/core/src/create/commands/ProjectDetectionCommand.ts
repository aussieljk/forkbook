import { ProjectType } from '@aussieljk/forkbook/internal/cli';
import type { JsPackageManager } from '@aussieljk/forkbook/internal/common';
import { logger, prompt } from '@aussieljk/forkbook/internal/node-logger';
import { telemetry } from '@aussieljk/forkbook/internal/telemetry';
import { SupportedLanguage } from '@aussieljk/forkbook/internal/types';

import { dedent } from 'ts-dedent';

import type { CommandOptions } from '../generators/types.ts';
import { createPromptCancelOptions } from '../prompt-cancel.ts';
import { ProjectTypeService } from '../services/ProjectTypeService.ts';
import { TelemetryService } from '../services/TelemetryService.ts';

/**
 * Command for detecting the project type during Forkbook initialization
 *
 * Responsibilities:
 *
 * - Auto-detect project type or use user-provided type
 * - Check for existing Forkbook installation
 * - Prompt for force install if needed
 */
export class ProjectDetectionCommand {
  constructor(
    private options: CommandOptions,
    jsPackageManager: JsPackageManager,
    private projectTypeService: ProjectTypeService = new ProjectTypeService(jsPackageManager),
    private telemetryService = new TelemetryService()
  ) {}

  /** Execute project type detection */
  async execute(): Promise<{ projectType: ProjectType; language: SupportedLanguage }> {
    let projectType: ProjectType;
    const projectTypeProvided = this.options.type;

    // Use provided type or auto-detect
    if (projectTypeProvided) {
      projectType = await this.projectTypeService.validateProvidedType(projectTypeProvided);
      logger.step(`Installing Forkbook for user specified project type: ${projectTypeProvided}`);
    } else {
      projectType = await this.projectTypeService.autoDetectProjectType();
      logger.debug(`Project type detected: ${projectType}`);
    }

    // Check for existing installation
    await this.checkExistingInstallation();

    const language = this.options.language || (await this.detectAndReportLanguage());

    return { projectType, language };
  }

  /** Detect language and warn about incompatible packages */
  private async detectAndReportLanguage(): Promise<SupportedLanguage> {
    const language = await this.projectTypeService.detectLanguage();

    if (language === SupportedLanguage.JAVASCRIPT) {
      const incompatibleReasons = await this.projectTypeService.detectIncompatiblePackageVersions();
      if (incompatibleReasons.length > 0) {
        logger.warn(
          `Populating with JavaScript examples due to incompatible package versions:\n${incompatibleReasons.map((r) => `  - ${r}`).join('\n')}`
        );
      }
    }

    return language;
  }

  /** Check if Forkbook is already installed and handle force option */
  private async checkExistingInstallation(): Promise<void> {
    const storybookInstantiated = this.projectTypeService.isStorybookInstantiated();
    const options = this.options;
    if (options.force !== true && options.yes !== true && storybookInstantiated) {
      const force = await prompt.confirm(
        {
          message: dedent`We found a .forkbook config directory in your project.
We assume that Forkbook is already instantiated for your project. Do you still want to continue and force the initialization?`,
        },
        createPromptCancelOptions(this.telemetryService, 'force-on-existing-installation')
      );
      if (force || options.yes) {
        options.force = true;
      } else {
        await telemetry(
          'exit',
          { eventType: 'init', reason: 'existing-installation' },
          { stripMetadata: true, immediate: true }
        );
        process.exit(0);
      }
    }
  }
}

export const executeProjectDetection = (
  packageManager: JsPackageManager,
  options: CommandOptions
) => {
  return new ProjectDetectionCommand(options, packageManager).execute();
};
