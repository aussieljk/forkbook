import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The config folder of a project when no `--config-dir` is given: `.forkbook`, or `.storybook`
 * when the project has only that one (a project that moved from Storybook).
 */
export function defaultConfigDir(cwd = process.cwd()): string {
  return !existsSync(join(cwd, '.forkbook')) && existsSync(join(cwd, '.storybook'))
    ? '.storybook'
    : '.forkbook';
}
