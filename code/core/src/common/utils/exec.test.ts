import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ExecError, exec, execNode, execSync } from './exec.ts';

const node = process.execPath;

describe('exec', () => {
  it('gives the output of a command', async () => {
    const { stdout, exitCode } = await exec(node, ['-e', 'console.log(process.env.FOO)'], {
      env: { FOO: 'bar' },
    });
    expect(stdout.trim()).toBe('bar');
    expect(exitCode).toBe(0);
  });

  it('streams stdout while the command runs', async () => {
    const child = exec(node, ['-e', 'console.log("one")']);
    const chunks: string[] = [];
    child.stdout?.on('data', (chunk) => chunks.push(String(chunk)));
    await child;
    expect(chunks.join('')).toContain('one');
  });

  it('rejects with the exit code and stderr when the command fails', async () => {
    const error = await exec(node, ['-e', 'console.error("bad"); process.exit(3)']).catch((e) => e);
    expect(error).toBeInstanceOf(ExecError);
    expect(error).toMatchObject({ exitCode: 3, stderr: expect.stringContaining('bad') });
  });

  it('rejects with ENOENT when the command does not exist', async () => {
    const error = await exec('forkbook-no-such-command').catch((e) => e);
    expect(error).toMatchObject({ code: 'ENOENT' });
  });
});

describe('execSync', () => {
  it('gives the output, and throws when the command fails', () => {
    expect(execSync(node, ['-e', 'process.stdout.write("hi")']).stdout).toBe('hi');
    expect(() => execSync(node, ['-e', 'process.exit(2)'])).toThrow(ExecError);
  });
});

describe('execNode', () => {
  it('starts a script with an IPC channel', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'forkbook-exec-'));
    const script = join(dir, 'child.mjs');
    writeFileSync(
      script,
      'process.on("message", (m) => { process.send(m * 2); process.exit(0); });'
    );

    const child = execNode(script);
    const answer = new Promise((resolve) => child.on('message', resolve));
    child.send(21);
    expect(await answer).toBe(42);
  });
});
