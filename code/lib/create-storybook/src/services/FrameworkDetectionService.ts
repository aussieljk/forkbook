import { type JsPackageManager, getProjectRoot } from 'storybook/internal/common';
import { prompt } from 'storybook/internal/node-logger';
import type { SupportedRenderer } from 'storybook/internal/types';
import { SupportedBuilder, SupportedFramework } from 'storybook/internal/types';

import * as find from 'empathic/find';

import { createPromptCancelOptions } from '../prompt-cancel.ts';
import { TelemetryService } from './TelemetryService.ts';

const viteConfigFiles = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];

export class FrameworkDetectionService {
  constructor(
    private jsPackageManager: JsPackageManager,
    private telemetryService = new TelemetryService()
  ) {}

  detectFramework(renderer: SupportedRenderer, builder: SupportedBuilder): SupportedFramework {
    if (Object.values(SupportedFramework).includes(renderer as any)) {
      return renderer as any as SupportedFramework;
    }

    const maybeFramework = `${renderer}-${builder}`;

    if (Object.values(SupportedFramework).includes(maybeFramework as SupportedFramework)) {
      return maybeFramework as SupportedFramework;
    }

    throw new Error(`Could not find framework for renderer: ${renderer} and builder: ${builder}`);
  }

  async detectBuilder() {
    const viteConfig = find.any(viteConfigFiles, { last: getProjectRoot() });
    const dependencies = this.jsPackageManager.getAllDependencies();

    if (viteConfig || dependencies.vite) {
      return SupportedBuilder.VITE;
    }

    return prompt.select(
      {
        message: 'We were not able to detect the right builder for your project. Please select one:',
        options: [{ label: 'Vite', value: SupportedBuilder.VITE }],
      },
      createPromptCancelOptions(this.telemetryService, 'builder-selection')
    );
  }
}
