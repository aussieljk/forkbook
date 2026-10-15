import { once } from '@aussieljk/forkbook/internal/node-logger';

import { getPrettyPackageManagerName, PackageManagerName } from './JsPackageManager.ts';

const PACKAGE_MANAGER_INSTALL_DOCS_URL = 'https://storybook.js.org/docs/get-started/install';

/**
 * Warns (once per process) when a project uses Yarn 1 (Classic), which Forkbook only supports on
 * a best-effort basis. Never throws and never blocks the calling flow.
 */
export function warnOnYarn1(packageManagerType: PackageManagerName): void {
  if (packageManagerType !== PackageManagerName.YARN1) {
    return;
  }

  try {
    once.warn(
      `${getPrettyPackageManagerName(packageManagerType)} is supported on a best-effort basis. Forkbook works best with npm, pnpm, or Yarn Berry. For more information, see: ${PACKAGE_MANAGER_INSTALL_DOCS_URL}`
    );
  } catch {
    // Logging must never break the CLI flow that triggered the warning.
  }
}
