import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Feature } from '@aussieljk/forkbook/internal/types';

import { AddonService } from './AddonService.ts';

vi.mock('@aussieljk/forkbook/internal/common', async () => {
  const actual = await vi.importActual('@aussieljk/forkbook/internal/common');
  return {
    ...actual,
    getPackageDetails: vi.fn().mockImplementation((pkg: string) => {
      const match = pkg.match(/^(@?[^@]+)(?:@(.+))?$/);
      return match ? [match[1], match[2]] : [pkg, undefined];
    }),
  };
});

describe('AddonService', () => {
  let manager: AddonService;

  beforeEach(() => {
    manager = new AddonService();
  });

  describe('getAddonsForFeatures', () => {
    it('should return empty array for no features', () => {
      const addons = manager.getAddonsForFeatures(new Set([]));
      expect(addons).toEqual([]);
    });

    it('should add vitest addon for test feature', () => {
      const addons = manager.getAddonsForFeatures(new Set([Feature.TEST]));
      expect(addons).toEqual(['@aussieljk/forkbook/addon-vitest']);
    });

    it('should add docs addon for docs feature', () => {
      const addons = manager.getAddonsForFeatures(new Set([Feature.DOCS]));
      expect(addons).toContain('@aussieljk/forkbook/addon-docs');
    });

    it('should add a11y addon for a11y feature', () => {
      const addons = manager.getAddonsForFeatures(new Set([Feature.A11Y]));
      expect(addons).toContain('@aussieljk/forkbook/addon-a11y');
    });

    it('should add all addons for all features', () => {
      const addons = manager.getAddonsForFeatures(
        new Set([Feature.DOCS, Feature.TEST, Feature.A11Y])
      );
      expect(addons).toContain('@aussieljk/forkbook/addon-docs');
      expect(addons).toContain('@aussieljk/forkbook/addon-vitest');
      expect(addons).toContain('@aussieljk/forkbook/addon-a11y');
    });
  });

  describe('stripVersions', () => {
    it('should strip version from addon names', () => {
      const addons = ['@storybook/addon-essentials@8.0.0', '@aussieljk/forkbook/addon-links@8.0.0'];
      const stripped = manager.stripVersions(addons);

      expect(stripped).toEqual(['@storybook/addon-essentials', '@aussieljk/forkbook/addon-links']);
    });

    it('should handle addons without versions', () => {
      const addons = ['@storybook/addon-essentials', '@aussieljk/forkbook/addon-links'];
      const stripped = manager.stripVersions(addons);

      expect(stripped).toEqual(['@storybook/addon-essentials', '@aussieljk/forkbook/addon-links']);
    });
  });

  describe('configureAddons', () => {
    it('should strip versions from addons in main config', () => {
      const config = manager.configureAddons(new Set([Feature.DOCS]), [
        '@aussieljk/forkbook/addon-links@8.0.0',
      ]);

      expect(config.addonsForMain).toContain('@aussieljk/forkbook/addon-links');
      expect(config.addonsForMain).not.toContain('@aussieljk/forkbook/addon-links@8.0.0');
    });

    it('should keep versions in addon packages', () => {
      const config = manager.configureAddons(new Set([Feature.TEST]), [
        '@aussieljk/forkbook/addon-links@8.0.0',
      ]);

      expect(config.addonPackages).toContain('@aussieljk/forkbook/addon-links@8.0.0');
    });

    it('should handle all features together', () => {
      const config = manager.configureAddons(new Set([Feature.DOCS, Feature.TEST, Feature.A11Y]), [
        '@aussieljk/forkbook/addon-links',
      ]);

      expect(config.addonsForMain).toHaveLength(1);
      expect(config.addonPackages).toHaveLength(1);
      expect(config.addonsForMain).toContain('@aussieljk/forkbook/addon-links');
    });

    it('should filter out falsy values', () => {
      const config = manager.configureAddons(new Set([]), []);

      expect(config.addonsForMain).not.toContain(undefined);
      expect(config.addonsForMain).not.toContain(null);
      expect(config.addonPackages).not.toContain(undefined);
      expect(config.addonPackages).not.toContain(null);
    });
  });
});
