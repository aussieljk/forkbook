import type { JsPackageManager } from 'storybook/internal/common';

export interface SetupInstructionsContext {
  configDir: string;
  docsUrl: (path: string) => string;
  mockDateInstall: string;
  mswInstall: string;
  packageManager: JsPackageManager;
  packageManagerName: string | undefined;
  tsx: string;
  ts: string;
}
