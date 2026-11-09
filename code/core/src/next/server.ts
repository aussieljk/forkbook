/**
 * Starts the Forkbook server as a child process of `next dev`, or reuses one that runs already.
 *
 * Next.js can load `next.config` more than once (in more than one process, and again after a config
 * change). A lock file under `node_modules/.cache/forkbook` holds the pid and port of the child, so
 * a second load reuses the child and does not start a second Forkbook.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';

export interface ForkbookLock {
  /** The pid of the Forkbook child, or of the process that is starting it. */
  pid: number;
  /** The pid of the process that started the child. */
  ownerPid: number;
  port: number;
  basePath: string;
  configDir: string;
  startedAt: string;
}

export function getLockPath(cwd: string): string {
  return join(cwd, 'node_modules', '.cache', 'forkbook', 'next-dev.lock.json');
}

export function readLock(lockPath: string): ForkbookLock | undefined {
  try {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as ForkbookLock;
    return typeof lock.pid === 'number' && typeof lock.port === 'number' ? lock : undefined;
  } catch {
    return undefined;
  }
}

/** True when a process with this pid runs. A process that we may not signal also counts. */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Gives a free TCP port on 127.0.0.1. `avoid` lists ports not to use (for example `PORT`). */
export async function findFreePort(avoid: number[] = []): Promise<number> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const port = await new Promise<number>((resolvePort, reject) => {
      const server = net.createServer();
      server.unref();
      server.once('error', reject);
      server.listen({ port: 0, host: '127.0.0.1' }, () => {
        const { port: freePort } = server.address() as net.AddressInfo;
        server.close(() => resolvePort(freePort));
      });
    });
    if (!avoid.includes(port)) {
      return port;
    }
  }
  throw new Error('withForkbook: could not find a free port');
}

/** The path of the `forkbook` CLI that the project resolves. */
export function resolveForkbookBin(cwd: string): string {
  const require = createRequire(join(cwd, 'package.json'));
  const packageJson = require.resolve('@aussieljk/forkbook/package.json');
  return join(dirname(packageJson), 'dist', 'bin', 'dispatcher.js');
}

export interface ForkbookServerOptions {
  cwd: string;
  basePath: string;
  configDir: string;
  /** A port to use. Default: `FORKBOOK_PORT`, else a free port that is not `PORT`. */
  port?: number;
  /** More arguments for `forkbook dev`. */
  args?: string[];
  /** Starts the child. Tests replace it. Default: `node <forkbook bin> dev ...`. */
  spawnServer?: (args: string[], env: NodeJS.ProcessEnv, cwd: string) => ChildProcess;
  env?: NodeJS.ProcessEnv;
  /**
   * A locked child whose port does not answer this long after its start is stale. It is stopped
   * and a new child starts. Default: 60 s.
   */
  startupGraceMs?: number;
}

export interface ForkbookServerHandle {
  port: number;
  pid: number;
  /** True when a child that runs already is used. */
  reused: boolean;
  /** The origin for the rewrites, for example `http://127.0.0.1:6006`. */
  origin: string;
  child?: ChildProcess;
}

/** The `forkbook dev` arguments for a child of `next dev`. */
export function getForkbookDevArgs({
  port,
  basePath,
  configDir,
  args = [],
}: {
  port: number;
  basePath: string;
  configDir: string;
  args?: string[];
}): string[] {
  return [
    'dev',
    '--port',
    String(port),
    '--exact-port',
    '--base-path',
    basePath,
    '--config-dir',
    configDir,
    '--ci',
    '--no-open',
    '--no-version-updates',
    ...args,
  ];
}

const defaultSpawn: NonNullable<ForkbookServerOptions['spawnServer']> = (args, env, cwd) =>
  spawn(process.execPath, [resolveForkbookBin(cwd), ...args], { cwd, env, stdio: 'inherit' });

/** Children this process started. They stop when this process exits. */
const ownChildren = new Set<ChildProcess>();
let exitHookInstalled = false;

function installExitHook(lockPath: string) {
  if (exitHookInstalled) {
    return;
  }
  exitHookInstalled = true;
  // 'exit' handlers must be synchronous. Next.js calls `process.exit` on Ctrl+C, so this runs then.
  process.once('exit', () => {
    for (const child of ownChildren) {
      child.kill('SIGTERM');
    }
    const lock = readLock(lockPath);
    if (lock?.ownerPid === process.pid) {
      rmSync(lockPath, { force: true });
    }
  });
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** True when something accepts TCP connections on `127.0.0.1:<port>`. */
export function isPortOpen(port: number, timeoutMs = 500): Promise<boolean> {
  return new Promise((done) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = (open: boolean) => {
      socket.destroy();
      done(open);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

/** Waits until the port answers. Gives false after `timeoutMs`, or when `stop()` is true. */
export async function waitForPort(
  port: number,
  {
    timeoutMs = 120_000,
    intervalMs = 250,
    stop,
  }: { timeoutMs?: number; intervalMs?: number; stop?: () => boolean } = {}
): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end && !stop?.()) {
    if (await isPortOpen(port)) {
      return true;
    }
    await sleep(intervalMs);
  }
  return false;
}

/**
 * True when the locked child cannot be used: its process is gone, or it is older than
 * `startupGraceMs` and its port does not answer (for example a killed child whose pid is used
 * again, or a child that hangs).
 */
export async function isLockStale(lock: ForkbookLock, startupGraceMs: number): Promise<boolean> {
  if (!isProcessAlive(lock.pid)) {
    return true;
  }
  if (await isPortOpen(lock.port)) {
    return false;
  }
  const age = Date.now() - Date.parse(lock.startedAt);
  // A new child (or one that is still starting) gets time to open its port.
  return !(age < startupGraceMs);
}

/**
 * Starts Forkbook for `next dev`, or reuses the child in the lock file when it runs with the same
 * base path and config folder. The child gets `FORKBOOK_PARENT_PID`, so it stops when this
 * process is gone, also after a hard kill.
 */
export async function ensureForkbookServer(
  options: ForkbookServerOptions
): Promise<ForkbookServerHandle> {
  const env = options.env ?? process.env;
  const cwd = resolve(options.cwd);
  const lockPath = getLockPath(cwd);
  const configDir = resolve(cwd, options.configDir);
  mkdirSync(dirname(lockPath), { recursive: true });

  for (let attempt = 0; attempt < 20; attempt++) {
    const lock = readLock(lockPath);
    const stale = lock ? await isLockStale(lock, options.startupGraceMs ?? 60_000) : true;
    if (lock && !stale) {
      if (lock.basePath === options.basePath && lock.configDir === configDir) {
        return {
          port: lock.port,
          pid: lock.pid,
          reused: true,
          origin: `http://127.0.0.1:${lock.port}`,
        };
      }
      // A child for other settings. Stop it and start a new one.
      try {
        process.kill(lock.pid, 'SIGTERM');
      } catch {
        // It stopped already.
      }
    } else if (lock && lock.pid !== process.pid && isProcessAlive(lock.pid)) {
      // The process runs but its port does not answer. Stop it, so it does not take the port later.
      try {
        process.kill(lock.pid, 'SIGTERM');
      } catch {
        // It stopped already.
      }
    }
    rmSync(lockPath, { force: true });

    const avoid = [Number(env.PORT)].filter((port) => Number.isInteger(port) && port > 0);
    const wanted = options.port ?? (env.FORKBOOK_PORT ? Number(env.FORKBOOK_PORT) : undefined);
    const port = wanted ?? (await findFreePort(avoid));

    // Create the lock only if no other process created it in the meantime.
    let fd: number;
    try {
      fd = openSync(lockPath, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        await sleep(100);
        continue;
      }
      throw error;
    }
    const base: Omit<ForkbookLock, 'pid'> = {
      ownerPid: process.pid,
      port,
      basePath: options.basePath,
      configDir,
      startedAt: new Date().toISOString(),
    };
    // Write the owner pid first, so other processes wait for this child and do not start another.
    writeFileSync(fd, JSON.stringify({ ...base, pid: process.pid }));
    closeSync(fd);

    const childEnv: NodeJS.ProcessEnv = {
      ...env,
      FORKBOOK_PARENT_PID: String(process.pid),
    };
    // These belong to the Next.js app (portless sets them). Forkbook gets its port from `--port`.
    delete childEnv.PORT;
    delete childEnv.HOST;
    const args = getForkbookDevArgs({
      port,
      basePath: options.basePath,
      configDir,
      args: options.args,
    });
    const child = (options.spawnServer ?? defaultSpawn)(args, childEnv, cwd);
    ownChildren.add(child);
    installExitHook(lockPath);
    child.once('exit', () => {
      ownChildren.delete(child);
      if (readLock(lockPath)?.pid === child.pid) {
        rmSync(lockPath, { force: true });
      }
    });
    if (child.pid !== undefined) {
      writeFileSync(lockPath, JSON.stringify({ ...base, pid: child.pid }));
    }
    return {
      port,
      pid: child.pid ?? process.pid,
      reused: false,
      origin: `http://127.0.0.1:${port}`,
      child,
    };
  }
  throw new Error(`withForkbook: could not take the lock file ${lockPath}`);
}
