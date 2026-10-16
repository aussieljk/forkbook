import { type ChildProcess, type StdioOptions, fork } from 'node:child_process';
import type { Readable } from 'node:stream';

import { type Output, x, xSync } from 'tinyexec';

export type ExecOptions = {
  cwd?: string;
  /** Added to the environment of this process. */
  env?: Record<string, string | undefined>;
  stdio?: StdioOptions;
  signal?: AbortSignal;
  /** Stops the command after this many milliseconds. */
  timeout?: number;
  shell?: boolean;
};

export type ExecOutput = Output;

/** A running command. Await it for its output; it rejects with an `ExecError`. */
export type ExecProcess = Promise<ExecOutput> & {
  stdout: Readable | null;
  stderr: Readable | null;
  kill: () => boolean;
};

/** A command that failed, with the fields that error reports and categories read. */
export class ExecError extends Error {
  command: string;
  shortMessage: string;
  exitCode?: number;
  signal?: string;
  code?: string;
  stdout: string;
  stderr: string;

  constructor(
    command: string,
    {
      exitCode,
      signal,
      code,
      stdout = '',
      stderr = '',
      cause,
    }: {
      exitCode?: number;
      signal?: string;
      code?: string;
      stdout?: string;
      stderr?: string;
      cause?: unknown;
    }
  ) {
    const reason = signal
      ? `was killed with ${signal}`
      : code
        ? `failed with ${code}`
        : `failed with exit code ${exitCode}`;
    const shortMessage = `Command ${reason}: ${command}`;
    super([shortMessage, stderr, stdout].filter(Boolean).join('\n\n'), { cause });
    this.name = 'ExecError';
    this.command = command;
    this.shortMessage = shortMessage;
    this.exitCode = exitCode;
    this.signal = signal;
    this.code = code;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

const withProcessEnv = (env?: ExecOptions['env']) => ({ ...process.env, ...env });

/** Runs a command, like `execa`. Nothing goes through a shell. */
export function exec(command: string, args: string[] = [], options: ExecOptions = {}): ExecProcess {
  const commandLine = [command, ...args].join(' ');
  const result = x(command, args, {
    throwOnError: false,
    timeout: options.timeout,
    nodeOptions: {
      cwd: options.cwd,
      env: withProcessEnv(options.env),
      stdio: options.stdio ?? 'pipe',
      signal: options.signal,
      shell: options.shell,
    },
  });

  const promise = Promise.resolve(result).then(
    (output) => {
      const signal = result.signalCode ?? undefined;
      if (output.exitCode !== 0 || signal) {
        throw new ExecError(commandLine, { ...output, signal });
      }
      return output;
    },
    (error: NodeJS.ErrnoException) => {
      if (error?.name === 'AbortError') {
        throw error;
      }
      throw new ExecError(commandLine, { code: error?.code, cause: error });
    }
  );

  return Object.assign(promise, {
    stdout: result.process?.stdout ?? null,
    stderr: result.process?.stderr ?? null,
    kill: () => result.kill(),
  });
}

/** Runs a command and waits for it. Throws an `ExecError` when it fails. */
export function execSync(command: string, args: string[] = [], options: ExecOptions = {}) {
  const commandLine = [command, ...args].join(' ');
  let output: Output & { signalCode: string | null };
  try {
    output = xSync(command, args, {
      throwOnError: false,
      timeout: options.timeout,
      nodeOptions: {
        cwd: options.cwd,
        env: withProcessEnv(options.env),
        stdio: options.stdio ?? 'pipe',
        encoding: 'utf8',
        shell: options.shell,
      },
    });
  } catch (error) {
    throw new ExecError(commandLine, {
      code: (error as NodeJS.ErrnoException)?.code,
      cause: error,
    });
  }
  const signal = output.signalCode ?? undefined;
  if (output.exitCode !== 0 || signal) {
    throw new ExecError(commandLine, { ...output, signal });
  }
  return output;
}

/** Starts a Node script with an IPC channel, like `execaNode`. */
export function execNode(
  scriptPath: string,
  args: string[] = [],
  options: Omit<ExecOptions, 'stdio'> = {}
): ChildProcess {
  return fork(scriptPath, args, {
    cwd: options.cwd,
    env: withProcessEnv(options.env),
    signal: options.signal,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });
}
