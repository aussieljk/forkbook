import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectType } from '@aussieljk/forkbook/internal/cli';
import { getProcessAncestry } from '@aussieljk/forkbook/internal/common';
import { telemetry } from '@aussieljk/forkbook/internal/telemetry';
import { Feature } from '@aussieljk/forkbook/internal/types';

import { TelemetryService } from './TelemetryService.ts';

vi.mock('@aussieljk/forkbook/internal/telemetry', { spy: true });
vi.mock('@aussieljk/forkbook/internal/common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@aussieljk/forkbook/internal/common')>()),
  getProcessAncestry: vi.fn(),
}));

describe('TelemetryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telemetry).mockResolvedValue(undefined);
  });

  describe('when telemetry is enabled', () => {
    let telemetryService: TelemetryService;

    beforeEach(() => {
      telemetryService = new TelemetryService();
    });

    it('should track install type', async () => {
      await telemetryService.trackInstallType('recommended');

      expect(telemetry).toHaveBeenCalledWith('init-step', {
        step: 'install-type',
        installType: 'recommended',
      });
    });

    it('should track the skills step', async () => {
      await telemetryService.trackSkills({
        result: 'failed',
        source: 'ai-feature',
        exitCode: 1,
      });

      expect(telemetry).toHaveBeenCalledWith('init-step', {
        step: 'skills',
        result: 'failed',
        source: 'ai-feature',
        exitCode: 1,
      });
    });

    it('should track init event', async () => {
      const data = {
        projectType: ProjectType.REACT,
        features: {
          dev: true,
          docs: true,
          test: false,
          ai: false,
        },
        versionSpecifier: '8.0.0',
        cliIntegration: 'vike',
      };

      await telemetryService.trackInit(data);

      expect(telemetry).toHaveBeenCalledWith('init', data, { configDir: undefined });
    });

    it('should track scaffolded event', async () => {
      const data = {
        packageManager: 'npm',
        projectType: 'react-vite-ts',
      };

      await telemetryService.trackScaffolded(data);

      expect(telemetry).toHaveBeenCalledWith('scaffolded-empty', data);
    });

    it('should track ai-prompt-nudge event with context when prompt was shown', async () => {
      await telemetryService.trackAiSetupNudge({ skipPrompt: false });

      expect(telemetry).toHaveBeenCalledWith('ai-prompt-nudge', {
        id: 'setup',
        origin: 'init',
        context: { skipPrompt: false },
      });
    });

    it('should track ai-prompt-nudge event with context when prompt was skipped', async () => {
      await telemetryService.trackAiSetupNudge({ skipPrompt: true });

      expect(telemetry).toHaveBeenCalledWith('ai-prompt-nudge', {
        id: 'setup',
        origin: 'init',
        context: { skipPrompt: true },
      });
    });

    it('should track prompt cancellation', async () => {
      await telemetryService.trackPromptCancel('install-type');

      expect(telemetry).toHaveBeenCalledWith(
        'canceled',
        { eventType: 'init', prompt: 'install-type' },
        { stripMetadata: true, immediate: true }
      );
    });
  });

  describe('trackInitWithContext', () => {
    it('should track init with version and CLI integration from ancestry', async () => {
      const telemetryService = new TelemetryService();
      const selectedFeatures = new Set([Feature.DOCS, Feature.TEST]);

      vi.mocked(getProcessAncestry).mockReturnValue([
        { command: 'npx @aussieljk/forkbook@8.0.5 init' },
      ] as any);

      await telemetryService.trackInitWithContext(
        ProjectType.REACT,
        selectedFeatures,
        '.rnforkbook'
      );

      expect(getProcessAncestry).toHaveBeenCalled();
      expect(telemetry).toHaveBeenCalledWith(
        'init',
        {
          projectType: ProjectType.REACT,
          features: {
            dev: true,
            docs: true,
            test: true,
            ai: false,
          },
          versionSpecifier: '8.0.5',
          cliIntegration: undefined,
        },
        { configDir: '.rnforkbook' }
      );
    });

    it('should handle ancestry errors gracefully', async () => {
      const telemetryService = new TelemetryService();
      const selectedFeatures = new Set([]);

      vi.mocked(getProcessAncestry).mockImplementation(() => {
        throw new Error('Ancestry error');
      });

      await telemetryService.trackInitWithContext(ProjectType.NEXTJS, selectedFeatures);

      expect(telemetry).toHaveBeenCalledWith(
        'init',
        {
          projectType: ProjectType.NEXTJS,
          features: {
            dev: true,
            docs: false,
            test: false,
            ai: false,
          },
          versionSpecifier: undefined,
          cliIntegration: undefined,
        },
        { configDir: undefined }
      );
    });

    it('should detect CLI integration from ancestry', async () => {
      const telemetryService = new TelemetryService();
      const selectedFeatures = new Set([]);

      vi.mocked(getProcessAncestry).mockReturnValue([
        { command: 'pnpm create vike@latest' },
      ] as any);

      await telemetryService.trackInitWithContext(ProjectType.NEXTJS, selectedFeatures);

      expect(telemetry).toHaveBeenCalledWith(
        'init',
        expect.objectContaining({
          cliIntegration: 'vike',
        }),
        { configDir: undefined }
      );
    });

    describe('when AI feature is selected', () => {
      beforeEach(() => {
        vi.mocked(getProcessAncestry).mockReturnValue([]);
      });

      it('should set ai: true when AI feature is selected', async () => {
        const telemetryService = new TelemetryService();
        const selectedFeatures = new Set([Feature.AI]);

        await telemetryService.trackInitWithContext(ProjectType.REACT, selectedFeatures);

        expect(telemetry).toHaveBeenCalledWith(
          'init',
          expect.objectContaining({
            features: expect.objectContaining({ ai: true }),
          }),
          { configDir: undefined }
        );
      });
    });
  });
});
