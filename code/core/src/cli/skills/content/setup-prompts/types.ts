import type { JsPackageManager } from '@aussieljk/forkbook/internal/common';

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
