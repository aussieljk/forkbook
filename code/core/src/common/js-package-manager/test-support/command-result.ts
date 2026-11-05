import type { prompt } from '@aussieljk/forkbook/internal/node-logger';

import type { executeCommand } from '../../utils/command.ts';

type CommandResult = Awaited<ReturnType<typeof executeCommand>>;
type Task = Parameters<typeof prompt.executeTaskWithSpinner>[0];

/**
 * A command result for a mocked `executeCommand`. The package managers read only `stdout` and
 * `stderr`, so the tests give only those fields.
 */
export const commandResult = (fields: { stdout?: string; stderr?: string }) =>
  fields as CommandResult;

/** Runs the task of a mocked `executeTaskWithSpinner`. The package managers pass one factory. */
export const runTask = async (task: Task) => {
  await Promise.resolve((task as Extract<Task, () => unknown>)());
};
