import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectType } from 'storybook/internal/cli';
import type { JsPackageManager } from 'storybook/internal/common';
import { logger } from 'storybook/internal/node-logger';
import { NxProjectDetectedError } from 'storybook/internal/server-errors';

import { ProjectTypeService } from './ProjectTypeService.ts';

describe('ProjectTypeService', () => {
  let pm: JsPackageManager;

  beforeEach(() => {
    pm = {
      getAllDependencies: vi.fn(() => ({}) as any),
      getModulePackageJSON: vi.fn(async () => ({ version: '0.0.0' })) as any,
      primaryPackageJson: { packageJson: {} as any },
    } as unknown as JsPackageManager;
    vi.spyOn(logger, 'error').mockImplementation(() => undefined as any);
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('autoDetectProjectType', () => {
    it('logs a helpful message when framework cannot be detected', async () => {
      const service = new ProjectTypeService(pm);
      vi.spyOn(service, 'detectProjectType').mockResolvedValue(ProjectType.UNDETECTED);

      await expect(service.autoDetectProjectType()).rejects.toThrowError(
        'Storybook failed to detect your project type'
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unable to initialize Storybook in this directory.')
      );
    });

    it('throws NxProjectDetectedError when NX project is detected', async () => {
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(true);
      await expect(service.autoDetectProjectType()).rejects.toBeInstanceOf(NxProjectDetectedError);
    });

    it('detects framework from package.json (nextjs)', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        dependencies: { next: '^13.0.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.NEXTJS);
    });

    it('does not detect a Vue project', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        dependencies: { vue: '^3.2.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);

      await expect(service.autoDetectProjectType()).rejects.toThrowError(
        'Storybook failed to detect your project type'
      );
    });

    it('falls back to REACT for a CRA project (react-scripts no longer detected)', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0', 'react-scripts': '^5.0.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT);
    });

    it('detects REACT_NATIVE via react-native-scripts', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        dependencies: { 'react-native-scripts': '^5.0.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('detects REACT_NATIVE via peerDependencies', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        peerDependencies: { react: '^18.0.0', 'react-native': '^0.76.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('detects REACT_NATIVE via peerDependencies react-native-scripts', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        peerDependencies: { react: '^18.0.0', 'react-native-scripts': '^5.0.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('detects REACT_NATIVE via expo dependency', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        dependencies: { expo: '^52.0.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('detects REACT via peerDependencies', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        peerDependencies: { react: '^18.0.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT);
    });

    it('detects REACT via devDependencies', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        devDependencies: { react: '^18.0.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT);
    });

    it('prefers REACT_NATIVE over REACT when markers are split across dependency sections', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        dependencies: { 'react-native': '^0.76.0' },
        peerDependencies: { react: '^18.0.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('does not detect REACT from react-dom alone', async () => {
      (pm as any).primaryPackageJson.packageJson = {
        peerDependencies: { 'react-dom': '^18.0.0' },
      };
      const service = new ProjectTypeService(pm);
      // @ts-expect-error private method spy
      vi.spyOn(service, 'isNxProject').mockReturnValue(false);

      await expect(service.autoDetectProjectType()).rejects.toThrowError(
        'Storybook failed to detect your project type'
      );
    });
  });

  describe('validateProvidedType', () => {
    it('accepts installable types and rejects invalid ones', async () => {
      const service = new ProjectTypeService(pm);
      await expect(service.validateProvidedType(ProjectType.REACT)).resolves.toBe(
        ProjectType.REACT
      );
      await expect(service.validateProvidedType(ProjectType.UNSUPPORTED)).rejects.toThrow(
        /Unknown project type supplied/
      );
    });
  });

  describe('detectLanguage', () => {
    // Note: FS-based language detection (jsconfig/tsconfig) is not tested here to avoid
    // mutating the real filesystem or mocking ESM builtin modules. Covered by TS tooling path.
    it('returns typescript when TS and compatible tooling are present', async () => {
      (pm.getAllDependencies as any) = vi.fn(() => ({ typescript: '^5.0.0' }));
      (pm.getModulePackageJSON as any) = vi.fn(async (name: string) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '6.7.0',
          'eslint-plugin-storybook': '0.7.0',
        };
        return { version: versions[name] } as any;
      });
      const service = new ProjectTypeService(pm);
      await expect(service.detectLanguage()).resolves.toBe('typescript');
    });

    it('returns javascript when TS/tooling versions are incompatible', async () => {
      (pm.getAllDependencies as any) = vi.fn(() => ({ typescript: '^4.8.0' }));
      (pm.getModulePackageJSON as any) = vi.fn(async (name: string) => {
        const versions: Record<string, string> = {
          typescript: '4.8.4',
          '@babel/plugin-transform-typescript': '7.19.0',
          '@typescript-eslint/parser': '5.43.0',
          'eslint-plugin-storybook': '0.6.7',
        };
        return { version: versions[name] } as any;
      });
      const service = new ProjectTypeService(pm);
      await expect(service.detectLanguage()).resolves.toBe('javascript');
    });

    it('returns javascript when only one tool is incompatible', async () => {
      (pm.getAllDependencies as any) = vi.fn(() => ({ typescript: '^5.0.0' }));
      (pm.getModulePackageJSON as any) = vi.fn(async (name: string) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '5.43.0', // only the parser is below 5.44.0
          'eslint-plugin-storybook': '0.7.0',
        };
        return { version: versions[name] } as any;
      });
      const service = new ProjectTypeService(pm);
      await expect(service.detectLanguage()).resolves.toBe('javascript');
    });

    it('returns typescript with canary eslint-plugin-storybook versions', async () => {
      (pm.getAllDependencies as any) = vi.fn(() => ({ typescript: '^5.0.0' }));
      (pm.getModulePackageJSON as any) = vi.fn(async (name: string) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '6.7.0',
          'eslint-plugin-storybook': '0.0.0-pr-34552-sha-a34e9165',
        };
        return { version: versions[name] } as any;
      });
      const service = new ProjectTypeService(pm);
      await expect(service.detectLanguage()).resolves.toBe('typescript');
    });
  });

  describe('detectIncompatiblePackageVersions', () => {
    it('returns empty array when all tooling is compatible', async () => {
      (pm.getModulePackageJSON as any) = vi.fn(async (name: string) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '6.7.0',
          'eslint-plugin-storybook': '0.7.0',
        };
        return { version: versions[name] } as any;
      });
      const service = new ProjectTypeService(pm);
      const reasons = await service.detectIncompatiblePackageVersions();
      expect(reasons).toEqual([]);
    });

    it('returns specific reasons for each incompatible package', async () => {
      (pm.getModulePackageJSON as any) = vi.fn(async (name: string) => {
        const versions: Record<string, string> = {
          typescript: '4.8.4',
          '@babel/plugin-transform-typescript': '7.19.0',
          '@typescript-eslint/parser': '5.43.0',
          'eslint-plugin-storybook': '0.6.7',
        };
        return { version: versions[name] } as any;
      });
      const service = new ProjectTypeService(pm);
      const reasons = await service.detectIncompatiblePackageVersions();
      expect(reasons).toContainEqual(expect.stringContaining('typescript 4.8.4 is below 4.9.0'));
    });

    it('returns only the specific failing package', async () => {
      (pm.getModulePackageJSON as any) = vi.fn(async (name: string) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '5.43.0', // only the parser is below 5.44.0
          'eslint-plugin-storybook': '0.7.0',
        };
        return { version: versions[name] } as any;
      });
      const service = new ProjectTypeService(pm);
      const reasons = await service.detectIncompatiblePackageVersions();
      expect(reasons).toEqual([
        expect.stringContaining('@typescript-eslint/parser 5.43.0 is below 5.44.0'),
      ]);
    });

    it('treats canary eslint-plugin-storybook versions as compatible', async () => {
      (pm.getModulePackageJSON as any) = vi.fn(async (name: string) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '6.7.0',
          'eslint-plugin-storybook': '0.0.0-pr-34552-sha-a34e9165',
        };
        return { version: versions[name] } as any;
      });
      const service = new ProjectTypeService(pm);
      const reasons = await service.detectIncompatiblePackageVersions();
      expect(reasons).toEqual([]);
    });
  });
});
