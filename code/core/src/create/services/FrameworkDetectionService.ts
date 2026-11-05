import { type JsPackageManager, getProjectRoot } from '@aussieljk/forkbook/internal/common';
import { prompt } from '@aussieljk/forkbook/internal/node-logger';
import type { SupportedRenderer } from '@aussieljk/forkbook/internal/types';
import { SupportedBuilder, SupportedFramework } from '@aussieljk/forkbook/internal/types';

import * as find from 'empathic/find';

import { createPromptCancelOptions } from '../prompt-cancel.ts';
import { TelemetryService } from './TelemetryService.ts';

const viteConfigFiles = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];

const isSupportedFramework = (value: string): value is SupportedFramework =>
  (Object.values(SupportedFramework) as string[]).includes(value);

export class FrameworkDetectionService {
  constructor(
    private jsPackageManager: JsPackageManager,
    private telemetryService = new TelemetryService()
  ) {}

  detectFramework(renderer: SupportedRenderer, builder: SupportedBuilder): SupportedFramework {
    if (isSupportedFramework(renderer)) {
      return renderer;
    }

    const maybeFramework = `${renderer}-${builder}`;

    if (isSupportedFramework(maybeFramework)) {
      return maybeFramework;
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
        message:
          'We were not able to detect the right builder for your project. Please select one:',
        options: [{ label: 'Vite', value: SupportedBuilder.VITE }],
      },
      createPromptCancelOptions(this.telemetryService, 'builder-selection')
    );
  }
}
