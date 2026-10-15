import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fs as memfs, vol } from 'memfs';

import type { Options } from '../../types/index.ts';

import { resolveSkillInputs } from './inputs.ts';

vi.mock('node:fs', { spy: true });
vi.mock('node:fs/promises', { spy: true });

beforeEach(() => {
  vol.reset();
  vi.mocked(existsSync).mockImplementation(memfs.existsSync);
  vi.mocked(readFile).mockImplementation(memfs.promises.readFile as typeof readFile);
  vi.spyOn(process, 'cwd').mockReturnValue('/project');
});

function createMockOptions({
  framework = '@aussieljk/forkbook/react-vite',
  configDir,
}: {
  framework?: string | { name: string };
  configDir?: string;
} = {}): Options {
  return {
    configDir,
    presets: {
      apply: vi.fn(async (key: string, defaultValue?: unknown) => {
        if (key === 'framework') {
          return framework;
        }
        return defaultValue;
      }),
    },
  } as unknown as Options;
}

describe('resolveSkillInputs', () => {
  it('resolves the framework and its mapped renderer from a string preset', async () => {
    const options = createMockOptions({ framework: '@aussieljk/forkbook/react-vite' });

    const inputs = await resolveSkillInputs(options);

    expect(inputs.framework).toBe('@aussieljk/forkbook/react-vite');
    expect(inputs.renderer).toBe('@aussieljk/forkbook/react');
  });

  it('resolves the framework from an object preset', async () => {
    const options = createMockOptions({ framework: { name: '@aussieljk/forkbook/nextjs-vite' } });

    const inputs = await resolveSkillInputs(options);

    expect(inputs.framework).toBe('@aussieljk/forkbook/nextjs-vite');
    expect(inputs.renderer).toBe('@aussieljk/forkbook/react');
  });

  it('leaves renderer undefined for an unmapped framework', async () => {
    const options = createMockOptions({ framework: '@storybook/some-unmapped-framework' });

    const inputs = await resolveSkillInputs(options);

    expect(inputs.framework).toBe('@storybook/some-unmapped-framework');
    expect(inputs.renderer).toBeUndefined();
  });

  it('spreads the resolved tool availability onto the result', async () => {
    const inputs = await resolveSkillInputs(createMockOptions());

    expect(inputs.moduleGraphSupported).toBe(false);
  });

  it('detects CSF Factories from a preview file that imports definePreview', async () => {
    vol.fromNestedJSON({
      '/project/.forkbook/preview.tsx': `import { definePreview } from '@aussieljk/forkbook/react-vite';\nexport default definePreview({});`,
    });

    const inputs = await resolveSkillInputs(createMockOptions({ configDir: '/project/.forkbook' }));

    expect(inputs).toMatchObject({
      csfFactories: true,
      previewFile: '.forkbook/preview.tsx',
      typescript: true,
    });
  });

  it('reads a plain JavaScript preview as CSF 3', async () => {
    vol.fromNestedJSON({
      '/project/.forkbook/preview.js': 'export default { parameters: {} };',
    });

    const inputs = await resolveSkillInputs(createMockOptions({ configDir: '/project/.forkbook' }));

    expect(inputs).toMatchObject({
      csfFactories: false,
      previewFile: '.forkbook/preview.js',
      typescript: false,
    });
  });

  it('names the preview file after the main config when the project has none', async () => {
    vol.fromNestedJSON({ '/project/.forkbook/main.ts': 'export default {};' });

    const inputs = await resolveSkillInputs(createMockOptions({ configDir: '/project/.forkbook' }));

    expect(inputs).toMatchObject({
      csfFactories: false,
      previewFile: '.forkbook/preview.ts',
      typescript: true,
    });
  });
});
