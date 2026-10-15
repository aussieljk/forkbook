import { isAbsolute, resolve } from 'node:path';

/**
 * Resolve the config directory of the Forkbook a CLI invocation targets: `--config-dir` when
 * given (relative paths resolve from the target project directory), `.forkbook` under it
 * otherwise.
 */
export function resolveStorybookConfigDir({
  cwd,
  configDir,
}: { cwd?: string; configDir?: string } = {}) {
  const projectCwd = resolve(cwd ?? process.cwd());
  if (configDir) {
    return isAbsolute(configDir) ? configDir : resolve(projectCwd, configDir);
  }
  return resolve(projectCwd, '.forkbook');
}
