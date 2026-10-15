import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JsPackageManager } from '@aussieljk/forkbook/internal/common';
import { prompt } from '@aussieljk/forkbook/internal/node-logger';
import {
  SupportedBuilder,
  SupportedFramework,
  SupportedRenderer,
} from '@aussieljk/forkbook/internal/types';

import * as find from 'empathic/find';

import { FrameworkDetectionService } from './FrameworkDetectionService.ts';

vi.mock('empathic/find', () => ({
  any: vi.fn(),
}));

vi.mock('@aussieljk/forkbook/internal/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aussieljk/forkbook/internal/common')>();
  return {
    ...actual,
    getProjectRoot: vi.fn(() => '/project/root'),
  };
});

vi.mock('@aussieljk/forkbook/internal/node-logger', () => ({
  prompt: {
    select: vi.fn(),
  },
}));

describe('FrameworkDetectionService', () => {
  let service: FrameworkDetectionService;
  let mockPackageManager: JsPackageManager;
  let mockTelemetryService: {
    trackPromptCancel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPackageManager = {
      getAllDependencies: vi.fn(() => ({})),
    } as unknown as JsPackageManager;
    mockTelemetryService = {
      trackPromptCancel: vi.fn().mockResolvedValue(undefined),
    };
    service = new FrameworkDetectionService(mockPackageManager, mockTelemetryService as any);
  });

  describe('detectFramework', () => {
    it('should return renderer directly if it is a valid framework', () => {
      const result = service.detectFramework(
        SupportedRenderer.REACT as SupportedRenderer,
        SupportedBuilder.VITE
      );
      expect(result).toBe(SupportedFramework.REACT_VITE);
    });

    it('should combine renderer and builder when renderer is not a framework', () => {
      const result = service.detectFramework(
        SupportedRenderer.REACT as SupportedRenderer,
        SupportedBuilder.VITE
      );
      expect(result).toBe(SupportedFramework.REACT_VITE);
    });

    it('should return react-vite framework for react renderer with vite builder', () => {
      const result = service.detectFramework(
        SupportedRenderer.REACT as SupportedRenderer,
        SupportedBuilder.VITE
      );
      expect(result).toBe(SupportedFramework.REACT_VITE);
    });

    it('should throw error for invalid renderer and builder combination', () => {
      const invalidRenderer = 'invalid-renderer' as SupportedRenderer;
      const invalidBuilder = SupportedBuilder.VITE;

      expect(() => {
        service.detectFramework(invalidRenderer, invalidBuilder);
      }).toThrow('Could not find framework for renderer: invalid-renderer and builder: vite');
    });
  });

  describe('detectBuilder', () => {
    it('should detect vite builder from config file', async () => {
      vi.mocked(find.any).mockImplementation((files: string[]) => {
        if (files.includes('vite.config.ts')) {
          return 'vite.config.ts';
        }
        return undefined;
      });
      vi.mocked(mockPackageManager.getAllDependencies).mockReturnValue({});

      const result = await service.detectBuilder();

      expect(result).toBe(SupportedBuilder.VITE);
      expect(prompt.select).not.toHaveBeenCalled();
    });

    it('should detect vite builder from dependencies', async () => {
      vi.mocked(find.any).mockReturnValue(undefined);
      vi.mocked(mockPackageManager.getAllDependencies).mockReturnValue({
        vite: '^5.0.0',
      });

      const result = await service.detectBuilder();

      expect(result).toBe(SupportedBuilder.VITE);
      expect(prompt.select).not.toHaveBeenCalled();
    });

    it('should prompt user when no builders are detected', async () => {
      vi.mocked(find.any).mockReturnValue(undefined);
      vi.mocked(mockPackageManager.getAllDependencies).mockReturnValue({});
      vi.mocked(prompt.select).mockResolvedValue(SupportedBuilder.VITE);

      const result = await service.detectBuilder();

      expect(result).toBe(SupportedBuilder.VITE);
      expect(prompt.select).toHaveBeenCalledWith(
        {
          message: expect.stringContaining('We were not able to detect the right builder'),
          options: [{ label: 'Vite', value: SupportedBuilder.VITE }],
        },
        expect.objectContaining({ onCancel: expect.any(Function) })
      );
    });

    it('should track prompt cancellation for builder selection and exit cleanly', async () => {
      vi.mocked(find.any).mockReturnValue(undefined);
      vi.mocked(mockPackageManager.getAllDependencies).mockReturnValue({});
      vi.mocked(prompt.select).mockResolvedValue(SupportedBuilder.VITE);

      await service.detectBuilder();

      const onCancel = vi.mocked(prompt.select).mock.calls[0]?.[1]?.onCancel;
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await onCancel?.();

      expect(mockTelemetryService.trackPromptCancel).toHaveBeenCalledWith('builder-selection');
      expect(exitSpy).toHaveBeenCalledWith(0);

      exitSpy.mockRestore();
    });

    it('should check all vite config file variants', async () => {
      const viteConfigs = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];
      for (const config of viteConfigs) {
        vi.mocked(find.any).mockImplementation((files: string[]) => {
          if (files.includes(config)) {
            return config;
          }
          return undefined;
        });
        vi.mocked(mockPackageManager.getAllDependencies).mockReturnValue({});

        const result = await service.detectBuilder();

        expect(result).toBe(SupportedBuilder.VITE);
        vi.clearAllMocks();
      }
    });
  });
});
