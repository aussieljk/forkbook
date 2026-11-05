import { describe, expect, it, vi } from 'vitest';

import type { Readable } from 'node:stream';

import type { ExecProcess } from '../common/utils/exec.ts';

import { executeTaskWithSpinner } from './tasks.ts';

/** Makes `child` settle as `promise` does: it inherits from it and binds its methods. */
const settleLike = (child: object, promise: Promise<unknown>) => {
  Object.setPrototypeOf(child, promise);
  Object.assign(child, {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  });
};

// Create a minimal fake ExecProcess
const makeChild = (onStart?: (cp: Partial<ExecProcess>) => void): ExecProcess => {
  const listeners: Record<string, Function[]> = {};
  const stdout = {
    on: vi.fn((event: string, cb: (data: Buffer) => void) => {
      listeners[event] ||= [];
      listeners[event].push(cb);
    }),
  } as unknown as Readable;

  const cp: Partial<ExecProcess> = {
    stdout,
    then: undefined,
    catch: undefined,
    finally: undefined,
  };

  settleLike(cp, Promise.resolve());

  onStart?.(cp);
  return cp as ExecProcess;
};

describe('executeTaskWithSpinner', () => {
  it('returns "aborted" when the child process rejects with an abort error', async () => {
    const outcome = await executeTaskWithSpinner(() => makeChild(), {
      id: 'test',
      intro: 'Intro',
      error: 'Error',
      success: 'Success',
      abortable: true,
    });

    // Non-abort path returns undefined
    expect(outcome).toBeUndefined();

    // Simulate an aborted child process by rejecting with an abort-like error message
    const outcome2 = await executeTaskWithSpinner(
      () => {
        const err = new Error('The operation was aborted');
        const p = Promise.reject(err);
        // Avoid unhandled rejection warnings
        p.catch(() => {});
        const cp = makeChild();
        // Make the thenable reject
        settleLike(cp, p);
        return cp;
      },
      {
        id: 'test2',
        intro: 'Intro',
        error: 'Error',
        success: 'Success',
        abortable: true,
      }
    );

    expect(outcome2).toBe('aborted');
  });
});
