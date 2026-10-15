import { isCI } from '@aussieljk/forkbook/internal/common';
import { logger, prompt } from '@aussieljk/forkbook/internal/node-logger';
import type {
  SupportedBuilder,
  SupportedFramework,
  SupportedRenderer,
} from '@aussieljk/forkbook/internal/types';
import { Feature } from '@aussieljk/forkbook/internal/types';

import { dedent } from 'ts-dedent';

import type { CommandOptions } from '../generators/types.ts';
import { createPromptCancelOptions } from '../prompt-cancel.ts';
import { TelemetryService } from '../services/TelemetryService.ts';

export type InstallType = 'recommended' | 'light';

export interface UserPreferencesResult {
  /**
   * The features that the user has selected explicitly or implicitly and which can actually be
   * installed based on the project type or other constraints.
   */
  selectedFeatures: Set<Feature>;
}

export interface UserPreferencesOptions {
  skipPrompt?: boolean;
  framework: SupportedFramework | null;
  builder: SupportedBuilder;
  renderer: SupportedRenderer;
  isTestFeatureAvailable: boolean;
  isAiAvailable: boolean;
  isAiSetupAvailable: boolean;
}

/**
 * Command for gathering user preferences during Forkbook initialization
 *
 * Responsibilities:
 *
 * - Display version information
 * - Prompt for install type (recommended vs minimal)
 * - Run feature compatibility checks
 * - Track telemetry events
 */
export class UserPreferencesCommand {
  constructor(
    private readonly commandOptions: CommandOptions,
    private readonly telemetryService = new TelemetryService()
  ) {}

  /** Execute user preferences gathering */
  async execute(options: UserPreferencesOptions): Promise<UserPreferencesResult> {
    // Display version information
    const isInteractive = process.stdout.isTTY && !isCI();
    const skipPrompt = !isInteractive || !!this.commandOptions.yes;

    const commandOptionsFeatures = this.handleCommandOptionsFeatureFlag();

    if (commandOptionsFeatures) {
      return { selectedFeatures: commandOptionsFeatures };
    }

    // Get install type
    const installType: InstallType = this.commandOptions.features
      ? 'recommended'
      : await this.promptInstallType(skipPrompt, options.isTestFeatureAvailable);

    const useAi = options.isAiAvailable
      ? await this.promptAiSetup(skipPrompt, options.isAiSetupAvailable)
      : false;

    const selectedFeatures = this.determineFeatures(
      installType,
      options.isTestFeatureAvailable,
      useAi,
      options.isAiSetupAvailable
    );

    return { selectedFeatures };
  }

  private handleCommandOptionsFeatureFlag(): Set<Feature> | null {
    if (this.commandOptions.features && this.commandOptions.features?.length > 0) {
      logger.warn(dedent`
        Skipping feature validation as these features were explicitly selected:
        ${Array.from(this.commandOptions.features).join(', ')}
      `);
      return new Set(this.commandOptions.features);
    } else if (this.commandOptions.features?.length === 0) {
      logger.warn(dedent`
        All features have been disabled via --no-features flag.
      `);
      return new Set();
    }

    return null;
  }

  /** Prompt user for install type */
  private async promptInstallType(
    skipPrompt: boolean,
    isTestFeatureAvailable: boolean
  ): Promise<InstallType> {
    let installType: InstallType = 'recommended';

    const recommendedLabel = isTestFeatureAvailable
      ? `Recommended: Component development, docs, and testing features.`
      : `Recommended: Component development and docs`;

    if (!skipPrompt) {
      installType = await prompt.select(
        {
          message: 'What configuration should we install?',
          options: [
            {
              label: recommendedLabel,
              value: 'recommended',
            },
            {
              label: `Minimal: Just the essentials for component development.`,
              value: 'light',
            },
          ],
        },
        createPromptCancelOptions(this.telemetryService, 'install-type')
      );
    }

    await this.telemetryService.trackInstallType(installType);

    return installType;
  }

  /** Determine features based on install type and user status */
  private determineFeatures(
    installType: InstallType,
    isTestFeatureAvailable: boolean,
    useAi: boolean,
    isAiSetupAvailable: boolean
  ): Set<Feature> {
    const features = new Set<Feature>();

    if (installType === 'recommended') {
      features.add(Feature.DOCS);
      features.add(Feature.A11Y);

      if (isTestFeatureAvailable) {
        features.add(Feature.TEST);
      }
    }

    if (useAi) {
      features.add(Feature.AI);
    }

    if (useAi && isAiSetupAvailable && isTestFeatureAvailable) {
      features.add(Feature.TEST);
    }

    return features;
  }

  /** Prompt user about AI-assisted Forkbook setup */
  private async promptAiSetup(skipPrompt: boolean, isAiSetupAvailable: boolean): Promise<boolean> {
    const useAi = skipPrompt
      ? true
      : await prompt.confirm(
          {
            message: isAiSetupAvailable
              ? 'Do you want AI features, like skills and prompts, in your Forkbook?'
              : 'Do you want AI features, like skills, in your Forkbook?',
            initialValue: true,
          },
          createPromptCancelOptions(this.telemetryService, 'ai-setup')
        );

    if (useAi && isAiSetupAvailable) {
      await this.telemetryService.trackAiSetupNudge({ skipPrompt });
    }

    return useAi;
  }
}

export const executeUserPreferences = ({
  options,
  ...restOptions
}: UserPreferencesOptions & {
  options: CommandOptions;
}) => {
  return new UserPreferencesCommand(options).execute(restOptions);
};
