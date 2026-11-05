import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generate } from './generate.ts';

describe('generate', () => {
  let configPath: string;

  beforeEach(() => {
    configPath = mkdtempSync(join(tmpdir(), 'rnforkbook-'));
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

    const file = readFileSync(join(configPath, 'forkbook.requires.ts'), 'utf8');
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

    const file = readFileSync(join(configPath, 'forkbook.requires.ts'), 'utf8');
    expect(file).toContain('import "@aussieljk/forkbook/addon-ondevice-controls/register";');
    expect(file).toContain('import "@aussieljk/forkbook/addon-ondevice-actions/register";');
  });

  it('writes the story folders from the app folder, whatever folder it runs in', async () => {
    const app = mkdtempSync(join(tmpdir(), 'rnforkbook-app-'));
    const config = join(app, '.rnforkbook');
    mkdirSync(config);
    mkdirSync(join(app, 'src', 'stories'), { recursive: true });
    writeFileSync(join(config, 'preview.tsx'), 'export default {};\n');
    writeFileSync(
      join(config, 'main.ts'),
      "export default { stories: ['../src/stories/**/*.stories.tsx'], deviceAddons: [] };\n"
    );

    try {
      await generate({ configPath: config });

      const file = readFileSync(join(config, 'forkbook.requires.ts'), 'utf8');
      expect(file).toContain('directory: "./src/stories"');
      expect(file).toContain("'../src/stories'");
    } finally {
      rmSync(app, { recursive: true, force: true });
    }
  });
});
