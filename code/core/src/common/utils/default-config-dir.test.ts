import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { defaultConfigDir } from './default-config-dir.ts';

const project = (...dirs: string[]) => {
  const cwd = mkdtempSync(join(tmpdir(), 'forkbook-config-dir-'));
  for (const dir of dirs) mkdirSync(join(cwd, dir));
  return cwd;
};

describe('defaultConfigDir', () => {
  it('uses .forkbook when the project has no config folder', () => {
    expect(defaultConfigDir(project())).toBe('.forkbook');
  });

  it('uses .storybook when the project has only that folder', () => {
    expect(defaultConfigDir(project('.storybook'))).toBe('.storybook');
  });

  it('uses .forkbook when the project has both folders', () => {
    expect(defaultConfigDir(project('.forkbook', '.storybook'))).toBe('.forkbook');
  });
});
