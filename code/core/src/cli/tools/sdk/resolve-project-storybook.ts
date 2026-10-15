import { createRequire } from 'node:module';
import { join } from 'node:path';

const CHILD_HOST_ENTRY = '@aussieljk/forkbook/internal/tools/child-host';

export function resolveChildHostScript(resolutionRoot: string): string {
  const rootRequire = createRequire(join(resolutionRoot, 'package.json'));
  return rootRequire.resolve(CHILD_HOST_ENTRY, { paths: [resolutionRoot] });
}
