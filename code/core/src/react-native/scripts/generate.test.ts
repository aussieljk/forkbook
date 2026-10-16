import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generate } from './generate.ts';

describe('generate', () => {
  let configPath: string;

  beforeEach(() => {
    configPath = mkdtempSync(join(tmpdir(), 'rnstorybook-'));
    writeFileSync(join(configPath, 'preview.tsx'), 'export default {};\n');
  });

  afterEach(() => {
    rmSync(configPath, { recursive: true, force: true });
  });

  const writeMain = (deviceAddons: string[]) =>
    writeFileSync(
      join(configPath, 'main.ts'),
      `export default { stories: ['./stories/*.stories.tsx'], deviceAddons: ${JSON.stringify(deviceAddons)} };\n`
    );

  it('writes imports of Forkbook, not of @storybook/react-native', async () => {
    writeMain([]);

    await generate({ configPath });

    const file = readFileSync(join(configPath, 'storybook.requires.ts'), 'utf8');
    expect(file).toContain('/// <reference types="@aussieljk/forkbook/react-native/metro-env" />');
    expect(file).toContain(
      "import { start, updateView, type View, type Features } from '@aussieljk/forkbook/react-native';"
    );
    expect(file).toContain(
      `require('./preview'),\n  require("@aussieljk/forkbook/react-native/preview")`
    );
    expect(file).not.toContain('@storybook/');
  });

  it('registers the on-device addons by their Forkbook paths, also for the upstream names', async () => {
    writeMain(['@storybook/addon-ondevice-controls', '@aussieljk/forkbook/addon-ondevice-actions']);

    await generate({ configPath });

    const file = readFileSync(join(configPath, 'storybook.requires.ts'), 'utf8');
    expect(file).toContain('import "@aussieljk/forkbook/addon-ondevice-controls/register";');
    expect(file).toContain('import "@aussieljk/forkbook/addon-ondevice-actions/register";');
  });
});
