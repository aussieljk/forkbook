import { getPackageDetails } from '@aussieljk/forkbook/internal/common';
import { Feature } from '@aussieljk/forkbook/internal/types';

export interface AddonConfiguration {
  addonsForMain: Array<string | { name: string; [key: string]: any }>;
  addonPackages: string[];
}

/** Module for managing Forkbook addons */
export class AddonService {
  /** Get addons based on selected features */
  getAddonsForFeatures(features: Set<Feature>): string[] {
    const addons: string[] = [];

    if (features.has(Feature.TEST)) {
      addons.push('@aussieljk/forkbook/addon-vitest');
    }

    if (features.has(Feature.A11Y)) {
      addons.push('@aussieljk/forkbook/addon-a11y');
    }

    if (features.has(Feature.DOCS)) {
      addons.push('@aussieljk/forkbook/addon-docs');
    }

    return addons;
  }

  /** Strip version numbers from addon names */
  stripVersions(addons: string[]): string[] {
    return addons.map((addon) => getPackageDetails(addon)[0]);
  }

  /** Configure addons for the project */
  configureAddons(features: Set<Feature>, extraAddons: string[] = []): AddonConfiguration {
    // Addons added to main.js
    const addonsForMain = this.stripVersions(extraAddons).filter(Boolean);

    // Packages added to package.json
    const addonPackages = extraAddons.filter(Boolean);

    return {
      addonsForMain,
      addonPackages,
    };
  }
}
