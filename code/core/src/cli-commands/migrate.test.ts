import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { migrate, migrateSource } from './migrate.ts';

let cwd: string;

async function fixture(files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true });
    await writeFile(join(cwd, path), content);
  }
}

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'forkbook-migrate-'));
  await fixture({
    'package.json': JSON.stringify({
      scripts: {
        storybook: 'STORYBOOK_THEME=dark storybook dev',
        'storybook:ios': 'sb-rn-get-stories && expo start --ios',
        'build-storybook': 'storybook build -c .storybook',
      },
      devDependencies: { storybook: '^10.0.0', '@storybook/react-vite': '^10.0.0', vite: '^8.0.0' },
    }),
    '.storybook/main.ts': `import type { StorybookConfig } from '@storybook/react-vite';\nexport default { framework: '@storybook/react-vite', addons: ['@storybook/addon-docs'] } satisfies StorybookConfig;`,
    '.rnstorybook/index.ts': `import { view } from './storybook.requires';\n`,
    'metro.config.js': `const { withStorybook } = require('@storybook/react-native/metro/withStorybook');\n`,
    'src/Button.stories.tsx': `import { fn } from 'storybook/test';\nimport type { Meta } from "@storybook/react-vite";\nconst theme = process.env.STORYBOOK_THEME;\n`,
    'src/styles.css': `.sb-show-main { color: var(--sb-color); } .usb-port {}\n`,
    'src/plain.ts': `export const a = 1;\n`,
    'node_modules/x/index.js': `import 'storybook/test';\n`,
  });
});

afterEach(() => rm(cwd, { recursive: true, force: true }));

describe('migrateSource', () => {
  it('rewrites imports, env vars, globals, classes and CSS variables', () => {
    expect(
      migrateSource(
        `import x from '@storybook/addon-links'; import 'storybook/internal/types'; window.__STORYBOOK_ADDONS; 'sb-main-padded'; var(--sb-a)`
      )
    ).toBe(
      `import x from '@aussieljk/forkbook/addon-links'; import '@aussieljk/forkbook/internal/types'; window.__FORKBOOK_ADDONS; 'fb-main-padded'; var(--fb-a)`
    );
  });
});

describe('migrate', () => {
  it('changes the packages and the files', async () => {
    const result = await migrate({ cwd, version: '1.2.3' });

    expect(result.removedPackages).toEqual(['storybook', '@storybook/react-vite']);
    expect(result.moved).toEqual(['.storybook -> .forkbook', '.rnstorybook -> .rnforkbook']);
    expect(result.changedFiles).toEqual([
      'package.json',
      '.forkbook/main.ts',
      '.rnforkbook/index.ts',
      'metro.config.js',
      'src/Button.stories.tsx',
      'src/styles.css',
    ]);
    expect(result.installCommand).toBe('bun install');

    const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8'));
    expect(pkg.devDependencies).toEqual({ vite: '^8.0.0', '@aussieljk/forkbook': '^1.2.3' });
    expect(pkg.scripts).toEqual({
      forkbook: 'FORKBOOK_THEME=dark forkbook dev',
      'forkbook:ios': 'forkbook rn-stories && expo start --ios',
      'build-storybook': 'forkbook build -c .forkbook',
    });
    expect(await readFile(join(cwd, '.forkbook/main.ts'), 'utf8')).toContain(
      `import type { ForkbookConfig } from '@aussieljk/forkbook/react-vite';`
    );
    expect(await readFile(join(cwd, '.rnforkbook/index.ts'), 'utf8')).toBe(
      `import { view } from './forkbook.requires';\n`
    );
    expect(await readFile(join(cwd, 'metro.config.js'), 'utf8')).toBe(
      `const { withForkbook } = require('@aussieljk/forkbook/react-native/metro/withForkbook');\n`
    );
    expect(await readFile(join(cwd, 'src/Button.stories.tsx'), 'utf8')).toBe(
      `import { fn } from '@aussieljk/forkbook/test';\nimport type { Meta } from "@aussieljk/forkbook/react-vite";\nconst theme = process.env.FORKBOOK_THEME;\n`
    );
    expect(await readFile(join(cwd, 'src/styles.css'), 'utf8')).toBe(
      `.fb-show-main { color: var(--fb-color); } .usb-port {}\n`
    );
    expect(await readFile(join(cwd, 'node_modules/x/index.js'), 'utf8')).toBe(
      `import 'storybook/test';\n`
    );
  });

  it('does not write with dryRun', async () => {
    const result = await migrate({ cwd, version: '1.2.3', dryRun: true });

    expect(result.changedFiles).toContain('src/Button.stories.tsx');
    expect(await readFile(join(cwd, 'src/Button.stories.tsx'), 'utf8')).toContain(
      `'storybook/test'`
    );
  });
});
