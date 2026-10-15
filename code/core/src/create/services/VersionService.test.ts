import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JsPackageManager } from 'storybook/internal/common';

import { VersionService } from './VersionService.ts';

vi.mock('storybook/internal/common', async () => {
  const actual = await vi.importActual('storybook/internal/common');
  return {
    ...actual,
    versions: {
      storybook: '8.0.0',
    },
  };
});

describe('VersionService', () => {
  let versionService: VersionService;
  let mockPackageManager: JsPackageManager;

  beforeEach(() => {
    versionService = new VersionService();
    mockPackageManager = {
      latestVersion: vi.fn(),
    } as any;
  });

  describe('getCurrentVersion', () => {
    it('should return the current Storybook version', () => {
      expect(versionService.getCurrentVersion()).toBe('8.0.0');
    });
  });

  describe('getLatestVersion', () => {
    it('should fetch the latest version from package manager', async () => {
      vi.mocked(mockPackageManager.latestVersion).mockResolvedValue('8.1.0');

      const latestVersion = await versionService.getLatestVersion(mockPackageManager);

      expect(latestVersion).toBe('8.1.0');
      expect(mockPackageManager.latestVersion).toHaveBeenCalledWith('storybook');
    });
  });

  describe('isPrerelease', () => {
    it('should return true for prerelease versions', () => {
      expect(versionService.isPrerelease('8.0.0-alpha.1')).toBe(true);
      expect(versionService.isPrerelease('8.0.0-beta.2')).toBe(true);
      expect(versionService.isPrerelease('8.0.0-rc.3')).toBe(true);
    });

    it('should return false for stable versions', () => {
      expect(versionService.isPrerelease('8.0.0')).toBe(false);
      expect(versionService.isPrerelease('8.1.2')).toBe(false);
    });
  });

  describe('isOutdated', () => {
    it('should return true when current version is older than latest', () => {
      expect(versionService.isOutdated('8.0.0', '8.1.0')).toBe(true);
      expect(versionService.isOutdated('7.6.0', '8.0.0')).toBe(true);
    });

    it('should return false when current version is same or newer', () => {
      expect(versionService.isOutdated('8.1.0', '8.1.0')).toBe(false);
      expect(versionService.isOutdated('8.2.0', '8.1.0')).toBe(false);
    });
  });

  describe('getCliIntegrationFromAncestry', () => {
    it('should return undefined if no known command found', () => {
      const ancestry = [{ command: 'npm init' }, { command: 'node /usr/local/bin/npm' }];

      const integration = versionService.getCliIntegrationFromAncestry(ancestry as any);

      expect(integration).toBeUndefined();
    });

    it('should detect vike new command', () => {
      const ancestry = [{ command: 'pnpm create vike@latest --- --react --storybook' }];

      const integration = versionService.getCliIntegrationFromAncestry(ancestry as any);

      expect(integration).toBe('vike');
    });
  });

  describe('getVersionInfo', () => {
    it('should return complete version info for stable version', async () => {
      vi.mocked(mockPackageManager.latestVersion).mockResolvedValue('8.1.0');

      const versionInfo = await versionService.getVersionInfo(mockPackageManager);

      expect(versionInfo).toEqual({
        currentVersion: '8.0.0',
        latestVersion: '8.1.0',
        isPrerelease: false,
        isOutdated: true,
      });
    });

    it('should not mark prerelease as outdated', async () => {
      const prereleaseService = new VersionService();
      vi.mocked(mockPackageManager.latestVersion).mockResolvedValue('8.1.0');

      // Mock getCurrentVersion to return prerelease
      vi.spyOn(prereleaseService, 'getCurrentVersion').mockReturnValue('8.0.0-alpha.1');

      const versionInfo = await prereleaseService.getVersionInfo(mockPackageManager);

      expect(versionInfo).toEqual({
        currentVersion: '8.0.0-alpha.1',
        latestVersion: '8.1.0',
        isPrerelease: true,
        isOutdated: false,
      });
    });

    it('should handle null latest version', async () => {
      vi.mocked(mockPackageManager.latestVersion).mockResolvedValue(null);

      const versionInfo = await versionService.getVersionInfo(mockPackageManager);

      expect(versionInfo).toEqual({
        currentVersion: '8.0.0',
        latestVersion: null,
        isPrerelease: false,
        isOutdated: false,
      });
    });
  });
});
