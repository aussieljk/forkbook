import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectType } from '@aussieljk/forkbook/internal/cli';
import type { JsPackageManager } from '@aussieljk/forkbook/internal/common';
import type { PackageJson } from '@aussieljk/forkbook/internal/types';
import { logger } from '@aussieljk/forkbook/internal/node-logger';
import { NxProjectDetectedError } from '@aussieljk/forkbook/internal/server-errors';

import { ProjectTypeService } from './ProjectTypeService.ts';

/** Stubs the private Nx check of the service. */
const stubIsNxProject = (service: ProjectTypeService, value: boolean) =>
  vi
    .spyOn(service as unknown as { isNxProject: () => boolean }, 'isNxProject')
    .mockReturnValue(value);

describe('ProjectTypeService', () => {
  let pm: JsPackageManager;

  /** Sets the package.json that the service reads. The tests give only the fields they need. */
  const setPackageJson = (packageJson: PackageJson) => {
    (pm.primaryPackageJson as { packageJson: PackageJson }).packageJson = packageJson;
  };

  beforeEach(() => {
    pm = {
      getAllDependencies: vi.fn(() => ({})),
      getModulePackageJSON: vi.fn(async () => ({ version: '0.0.0' })),
      primaryPackageJson: { packageJson: {} },
    } as unknown as JsPackageManager;
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('autoDetectProjectType', () => {
    it('logs a helpful message when framework cannot be detected', async () => {
      const service = new ProjectTypeService(pm);
      vi.spyOn(service, 'detectProjectType').mockResolvedValue(ProjectType.UNDETECTED);

      await expect(service.autoDetectProjectType()).rejects.toThrowError(
        'Forkbook failed to detect your project type'
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unable to initialize Forkbook in this directory.')
      );
    });

    it('throws NxProjectDetectedError when NX project is detected', async () => {
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, true);
      await expect(service.autoDetectProjectType()).rejects.toBeInstanceOf(NxProjectDetectedError);
    });

    it('detects framework from package.json (nextjs)', async () => {
      setPackageJson({
        dependencies: { next: '^13.0.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.NEXTJS);
    });

    it('does not detect a Vue project', async () => {
      setPackageJson({
        dependencies: { vue: '^3.2.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);

      await expect(service.autoDetectProjectType()).rejects.toThrowError(
        'Forkbook failed to detect your project type'
      );
    });

    it('falls back to REACT for a CRA project (react-scripts no longer detected)', async () => {
      setPackageJson({
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0', 'react-scripts': '^5.0.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT);
    });

    it('detects REACT_NATIVE via react-native-scripts', async () => {
      setPackageJson({
        dependencies: { 'react-native-scripts': '^5.0.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('detects REACT_NATIVE via peerDependencies', async () => {
      setPackageJson({
        peerDependencies: { react: '^18.0.0', 'react-native': '^0.76.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('detects REACT_NATIVE via peerDependencies react-native-scripts', async () => {
      setPackageJson({
        peerDependencies: { react: '^18.0.0', 'react-native-scripts': '^5.0.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('detects REACT_NATIVE via expo dependency', async () => {
      setPackageJson({
        dependencies: { expo: '^52.0.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('detects REACT via peerDependencies', async () => {
      setPackageJson({
        peerDependencies: { react: '^18.0.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT);
    });

    it('detects REACT via devDependencies', async () => {
      setPackageJson({
        devDependencies: { react: '^18.0.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT);
    });

    it('prefers REACT_NATIVE over REACT when markers are split across dependency sections', async () => {
      setPackageJson({
        dependencies: { 'react-native': '^0.76.0' },
        peerDependencies: { react: '^18.0.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);
      const result = await service.autoDetectProjectType();
      expect(result).toBe(ProjectType.REACT_NATIVE);
    });

    it('does not detect REACT from react-dom alone', async () => {
      setPackageJson({
        peerDependencies: { 'react-dom': '^18.0.0' },
      });
      const service = new ProjectTypeService(pm);
      stubIsNxProject(service, false);

      await expect(service.autoDetectProjectType()).rejects.toThrowError(
        'Forkbook failed to detect your project type'
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
      vi.mocked(pm.getAllDependencies).mockImplementation(() => ({ typescript: '^5.0.0' }));
      vi.mocked(pm.getModulePackageJSON).mockImplementation(async (name) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '6.7.0',
        };
        return { version: versions[name] };
      });
      const service = new ProjectTypeService(pm);
      await expect(service.detectLanguage()).resolves.toBe('typescript');
    });

    it('returns javascript when TS/tooling versions are incompatible', async () => {
      vi.mocked(pm.getAllDependencies).mockImplementation(() => ({ typescript: '^4.8.0' }));
      vi.mocked(pm.getModulePackageJSON).mockImplementation(async (name) => {
        const versions: Record<string, string> = {
          typescript: '4.8.4',
          '@babel/plugin-transform-typescript': '7.19.0',
          '@typescript-eslint/parser': '5.43.0',
        };
        return { version: versions[name] };
      });
      const service = new ProjectTypeService(pm);
      await expect(service.detectLanguage()).resolves.toBe('javascript');
    });

    it('returns javascript when only one tool is incompatible', async () => {
      vi.mocked(pm.getAllDependencies).mockImplementation(() => ({ typescript: '^5.0.0' }));
      vi.mocked(pm.getModulePackageJSON).mockImplementation(async (name) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '5.43.0', // only the parser is below 5.44.0
        };
        return { version: versions[name] };
      });
      const service = new ProjectTypeService(pm);
      await expect(service.detectLanguage()).resolves.toBe('javascript');
    });
  });

  describe('detectIncompatiblePackageVersions', () => {
    it('returns empty array when all tooling is compatible', async () => {
      vi.mocked(pm.getModulePackageJSON).mockImplementation(async (name) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '6.7.0',
        };
        return { version: versions[name] };
      });
      const service = new ProjectTypeService(pm);
      const reasons = await service.detectIncompatiblePackageVersions();
      expect(reasons).toEqual([]);
    });

    it('returns specific reasons for each incompatible package', async () => {
      vi.mocked(pm.getModulePackageJSON).mockImplementation(async (name) => {
        const versions: Record<string, string> = {
          typescript: '4.8.4',
          '@babel/plugin-transform-typescript': '7.19.0',
          '@typescript-eslint/parser': '5.43.0',
        };
        return { version: versions[name] };
      });
      const service = new ProjectTypeService(pm);
      const reasons = await service.detectIncompatiblePackageVersions();
      expect(reasons).toContainEqual(expect.stringContaining('typescript 4.8.4 is below 4.9.0'));
    });

    it('returns only the specific failing package', async () => {
      vi.mocked(pm.getModulePackageJSON).mockImplementation(async (name) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          '@babel/plugin-transform-typescript': '7.23.0',
          '@typescript-eslint/parser': '5.43.0', // only the parser is below 5.44.0
        };
        return { version: versions[name] };
      });
      const service = new ProjectTypeService(pm);
      const reasons = await service.detectIncompatiblePackageVersions();
      expect(reasons).toEqual([
        expect.stringContaining('@typescript-eslint/parser 5.43.0 is below 5.44.0'),
      ]);
    });

    it('does not check eslint-plugin-storybook', async () => {
      vi.mocked(pm.getModulePackageJSON).mockImplementation(async (name) => {
        const versions: Record<string, string> = {
          typescript: '5.2.0',
          'eslint-plugin-storybook': '0.6.7',
        };
        return { version: versions[name] };
      });
      const service = new ProjectTypeService(pm);
      const reasons = await service.detectIncompatiblePackageVersions();
      expect(reasons).toEqual([]);
      expect(pm.getModulePackageJSON).not.toHaveBeenCalledWith('eslint-plugin-storybook');
    });
  });
});
