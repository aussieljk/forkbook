import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it, vi } from 'vitest';

import { loadEnvs } from './envs.ts';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.FORKBOOK_FROM_PROCESS;
});

it('gives the FORKBOOK_ variables of the .env files and of process.env', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'forkbook-envs-'));
  writeFileSync(
    join(dir, '.env'),
    'FORKBOOK_A=one\nFORKBOOK_B=${FORKBOOK_A}-two\nFORKBOOK_FROM_PROCESS=file\nOTHER=no\n'
  );
  // The mode is NODE_ENV, which is `test` in Vitest.
  writeFileSync(join(dir, `.env.${process.env.NODE_ENV}`), 'FORKBOOK_A=mode\n');
  vi.spyOn(process, 'cwd').mockReturnValue(dir);
  process.env.FORKBOOK_FROM_PROCESS = 'process';

  const { raw } = await loadEnvs();

  expect(raw).toMatchObject({
    FORKBOOK_A: 'mode',
    FORKBOOK_B: 'mode-two',
    FORKBOOK_FROM_PROCESS: 'process',
    NODE_ENV: expect.any(String),
  });
  expect(raw).not.toHaveProperty('OTHER');
});
