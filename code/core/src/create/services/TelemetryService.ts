import type { ProjectType, SkillsInstallResult } from '@aussieljk/forkbook/internal/cli';
import {
  getProcessAncestry,
  getStorybookVersionSpecifierFromAncestry,
} from '@aussieljk/forkbook/internal/common';
import { telemetry } from '@aussieljk/forkbook/internal/telemetry';
import { Feature } from '@aussieljk/forkbook/internal/types';

import { VersionService } from './VersionService.ts';

/** Service for tracking telemetry events during Forkbook initialization */
export class TelemetryService {
  private versionService = new VersionService();

  /** Track install type selection */
  async trackInstallType(installType: 'recommended' | 'light'): Promise<void> {
    await telemetry('init-step', {
      step: 'install-type',
      installType,
    });
  }

  /** Track when a user accepts the AI setup nudge prompt */
  async trackAiSetupNudge(context: { skipPrompt: boolean }): Promise<void> {
    await telemetry('ai-prompt-nudge', {
      id: 'setup',
      origin: 'init',
      context,
    });
  }

  /** Track Playwright prompt decision (install | skip | aborted) */
  async trackPlaywrightPromptDecision(
    result: 'installed' | 'skipped' | 'aborted' | 'failed'
  ): Promise<void> {
    await telemetry('init-step', {
      step: 'playwright-install',
      result,
    });
  }

  /** Track the outcome of the official Forkbook skills install step */
  async trackSkills(result: SkillsInstallResult): Promise<void> {
    await telemetry('init-step', {
      step: 'skills',
      ...result,
    });
  }

  /** Track the main init event with all metadata */
  async trackInit(
    data: {
      projectType: ProjectType;
      features: {
        dev: boolean;
        docs: boolean;
        test: boolean;
        ai: boolean;
      };
      versionSpecifier?: string;
      cliIntegration?: string;
    },
    options: { configDir?: string } = {}
  ): Promise<void> {
    // Pass configDir so metadata resolves `.rnforkbook` (RN) instead of defaulting to `.forkbook`.
    await telemetry('init', data, { configDir: options.configDir });
  }

  /** Track empty directory scaffolding event */
  async trackScaffolded(data: { packageManager: string; projectType: string }): Promise<void> {
    await telemetry('scaffolded-empty', data);
  }

  /**
   * Track init with complete context including version and CLI integration from ancestry This
   * method encapsulates all telemetry gathering and tracking logic
   */
  async trackInitWithContext(
    projectType: ProjectType,
    selectedFeatures: Set<Feature>,
    configDir?: string
  ): Promise<void> {
    // Get telemetry info from process ancestry
    let versionSpecifier: string | undefined;
    let cliIntegration: string | undefined;

    try {
      const ancestry = getProcessAncestry();
      versionSpecifier = getStorybookVersionSpecifierFromAncestry(ancestry);
      cliIntegration = this.versionService.getCliIntegrationFromAncestry(ancestry);
    } catch {
      // Ignore errors getting ancestry
    }

    // Create features object and track
    const telemetryFeatures = {
      dev: true, // Always true during init
      docs: selectedFeatures.has(Feature.DOCS),
      test: selectedFeatures.has(Feature.TEST),
      ai: selectedFeatures.has(Feature.AI),
    };

    await this.trackInit(
      {
        projectType,
        features: telemetryFeatures,
        versionSpecifier,
        cliIntegration,
      },
      { configDir }
    );
  }

  async trackPromptCancel(prompt: string): Promise<void> {
    await telemetry(
      'canceled',
      { eventType: 'init', prompt },
      { stripMetadata: true, immediate: true }
    );
  }
}
