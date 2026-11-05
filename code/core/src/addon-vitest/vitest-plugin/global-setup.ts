import { type ChildProcess, spawn } from 'node:child_process';

import type { TestProject } from 'vitest/node';

import { logger } from '@aussieljk/forkbook/internal/node-logger';

import treeKill from 'tree-kill';

let forkbookProcess: ChildProcess | null = null;

const getIsVitestStandaloneRun = () => {
  try {
    const env = (import.meta.env || process?.env) as Record<string, string | undefined>;
    return env.STORYBOOK !== 'true';
  } catch (e) {
    return false;
  }
};

const isVitestStandaloneRun = getIsVitestStandaloneRun();

// TODO: Not run when executed via Forkbook
const checkForkbookRunning = async (forkbookUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(`${forkbookUrl}/iframe.html`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    logger.verbose(
      `Failed to get response from ${forkbookUrl}: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
};

const startForkbookIfNotRunning = async () => {
  const forkbookScript = process.env.__FORKBOOK_SCRIPT__ as string;
  const forkbookUrl = process.env.__FORKBOOK_URL__ as string;

  const isRunning = await checkForkbookRunning(forkbookUrl);

  if (isRunning) {
    logger.verbose('Forkbook is already running');
    return;
  }

  logger.verbose(`Starting Forkbook with command: ${forkbookScript}`);

  try {
    // We don't await the process because we don't want Vitest to hang while Forkbook is starting
    // Use shell so commands like `yarn forkbook` or `npm run forkbook -- --quiet`
    // are interpreted correctly across platforms.
    forkbookProcess = spawn(forkbookScript, {
      shell: true,
      stdio: process.env.DEBUG === 'storybook' ? 'pipe' : 'ignore',
      cwd: process.cwd(),
    });

    forkbookProcess.on('error', (error) => {
      logger.verbose('Failed to start Forkbook:' + error.message);
      throw error;
    });
  } catch (error: unknown) {
    logger.verbose('Failed to start Forkbook:' + (error as any).message);
    throw error;
  }
};

export const setup = async ({ config }: TestProject) => {
  if (config.watch && isVitestStandaloneRun) {
    await startForkbookIfNotRunning();
  }
};

export const teardown = async () => {
  if (!forkbookProcess) {
    return;
  }
  logger.verbose('Stopping Forkbook process');
  await new Promise<void>((resolve, reject) => {
    // Forkbook starts multiple child processes, so we need to kill the whole tree
    if (forkbookProcess?.pid) {
      const pid = forkbookProcess.pid;
      treeKill(pid, 'SIGTERM', (error) => {
        if (error) {
          // On Windows, tree-kill shells out to `taskkill`, which exits with code 128 when the
          // target PID no longer exists (e.g. Forkbook already exited or  was stopped by the user).
          // On POSIX, tree-kill already swallows the equivalent ESRCH internally.
          if (process.platform === 'win32' && 'code' in error && error.code === 128) {
            logger.verbose(
              `Forkbook process (pid ${pid}) already exited; treating teardown as successful (code ${error.code}: ${error.message})`
            );
            resolve();
            return;
          }
          logger.error('Failed to stop Forkbook process:');
          reject(error);
          return;
        }
        resolve();
      });
    }
  });
};
