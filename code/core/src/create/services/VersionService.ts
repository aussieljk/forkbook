import type { JsPackageManager, getProcessAncestry } from '@aussieljk/forkbook/internal/common';
import { versions } from '@aussieljk/forkbook/internal/common';

import { lt, prerelease } from 'semver';

/** Service for handling version-related operations during Forkbook initialization */
export class VersionService {
  /** Get the current Forkbook version */
  getCurrentVersion(): string {
    return versions['@aussieljk/forkbook'];
  }

  /** Get the latest Forkbook version from the package manager */
  async getLatestVersion(packageManager: JsPackageManager): Promise<string | null> {
    return packageManager.latestVersion('@aussieljk/forkbook');
  }

  /** Check if the current version is a prerelease version */
  isPrerelease(version: string): boolean {
    return !!prerelease(version);
  }

  /** Check if the current version is outdated compared to the latest version */
  isOutdated(currentVersion: string, latestVersion: string): boolean {
    return lt(currentVersion, latestVersion);
  }

  /** Extract CLI integration from process ancestry. Detects if Forkbook was invoked via vike. */
  getCliIntegrationFromAncestry(
    ancestry: ReturnType<typeof getProcessAncestry>
  ): string | undefined {
    return ancestry.some((ancestor) => ancestor.command?.includes('vike')) ? 'vike' : undefined;
  }

  /** Get version info including current, latest, and prerelease status */
  async getVersionInfo(packageManager: JsPackageManager): Promise<{
    currentVersion: string;
    latestVersion: string | null;
    isPrerelease: boolean;
    isOutdated: boolean;
  }> {
    const currentVersion = this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion(packageManager);
    const isPrereleaseVersion = this.isPrerelease(currentVersion);
    const isOutdatedVersion =
      latestVersion && !isPrereleaseVersion
        ? this.isOutdated(currentVersion, latestVersion)
        : false;

    return {
      currentVersion,
      latestVersion,
      isPrerelease: isPrereleaseVersion,
      isOutdated: isOutdatedVersion,
    };
  }
}
