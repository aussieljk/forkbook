import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { SupportedFramework, SupportedRenderer } from 'storybook/internal/types';

import { resolvePackageDir } from '../shared/utils/module.ts';

/** The folder with the CLI templates (example stories) of a framework or renderer, if it has one. */
export function getRendererDir(renderer: SupportedFramework | SupportedRenderer) {
  const dir = join(resolvePackageDir('storybook'), 'template', renderer);
  return existsSync(join(dir, 'cli')) ? dir : null;
}
