import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { SupportedRenderer } from '@aussieljk/forkbook/internal/types';

import { afterEach, describe, expect, it } from 'vitest';

import { getStorybookInfo } from './get-storybook-info.ts';

describe('getStorybookInfo React Native framework inference', () => {
  let dir: string;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('infers @storybook/react-native when framework is missing in .rnforkbook', async () => {
    dir = join(tmpdir(), `fb-rn-info-${Date.now()}`);
    mkdirSync(join(dir, '.rnforkbook'), { recursive: true });
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'rn-app',
        private: true,
        devDependencies: { '@storybook/react-native': '10.5.1', storybook: '10.5.3' },
      })
    );
    writeFileSync(
      join(dir, '.rnforkbook/main.js'),
      `module.exports = { stories: ['**/*.stories.tsx'], deviceAddons: [] };`
    );

    const info = await getStorybookInfo(join(dir, '.rnforkbook'), dir);

    expect(info.frameworkPackage).toBe('@storybook/react-native');
    expect(info.rendererPackage).toBe('@storybook/react-native');
    expect(info.renderer).toBe(SupportedRenderer.REACT_NATIVE);
  });

  it('does not infer RN framework for a plain .forkbook without framework', async () => {
    dir = join(tmpdir(), `fb-web-info-${Date.now()}`);
    mkdirSync(join(dir, '.forkbook'), { recursive: true });
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'web-app',
        private: true,
        devDependencies: { storybook: '10.5.3' },
      })
    );
    writeFileSync(join(dir, '.forkbook/main.js'), `module.exports = { stories: [] };`);

    const info = await getStorybookInfo(join(dir, '.forkbook'), dir);

    expect(info.frameworkPackage).toBeUndefined();
  });
});
