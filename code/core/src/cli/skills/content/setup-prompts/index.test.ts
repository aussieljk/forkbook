import { JsPackageManagerFactory, PackageManagerName } from 'storybook/internal/common';
import { SupportedRenderer } from 'storybook/internal/types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProjectInfo } from '../../project-info.ts';
import { DEFAULT_PROMPT_NAME, getSetupMarkdownOutput, PROMPT_NAMES } from './index.ts';

const projectInfo: ProjectInfo = {
  storybookVersion: '10.5.0',
  majorVersion: 10,
  framework: '@storybook/react-vite',
  rendererPackage: '@storybook/react',
  renderer: SupportedRenderer.REACT,
  builderPackage: '@storybook/builder-vite',
  addons: [],
  configDir: '.storybook',
  storiesPaths: [],
  language: 'ts',
  packageManager: JsPackageManagerFactory.getPackageManager({ force: PackageManagerName.NPM }),
  packageManagerName: 'npm',
  hasCsfFactoryPreview: false,
  monorepoType: undefined,
};

afterEach(() => vi.unstubAllEnvs());

describe.each(['ts', 'js'] as const)('setup instructions in %s projects', (language) => {
  it.each(['@storybook/react-vite', '@storybook/nextjs-vite'])(
    'preserves React examples for %s',
    async (framework) => {
      for (const name of [
        DEFAULT_PROMPT_NAME,
        'monorepo',
        'relaxed-limits',
        'monorepo-optimized-tests-relaxed-limits-no-story-deletion',
      ]) {
        vi.stubEnv('EVAL_SETUP_PROMPT', name);
        const { markdown } = await getSetupMarkdownOutput({ ...projectInfo, framework, language });

        expect(markdown).toContain(`preview.${language}x`);
        expect(markdown).toContain('<SessionProvider>');
        expect(markdown).toContain('<Story />');
        expect(markdown).toContain("children: 'Order now'");
        expect(markdown).toContain(`main.${language}x`);
        expect(markdown).toContain(`App.${language}x`);
        expect(markdown).toContain('providers wrapping `<App />`');
        expect(markdown).toContain('`useQuery`');
        expect(markdown).toContain('Use the **real** provider tree');
        expect(markdown).toContain("`createPortal(..., document.getElementById('foo'))`");
        expect(markdown).toContain('Copy JSX patterns');
        expect(markdown).toContain('a hex color in styled-components');
        expect(markdown).toContain("args: { children: 'Submit' }");
        expect(markdown).toContain("canvas.getByRole('button', { name: /submit/i })");
      }
    }
  );
});

it('does not assume React when project framework metadata is unavailable', async () => {
  vi.stubEnv('EVAL_SETUP_PROMPT', '');
  const { markdown } = await getSetupMarkdownOutput({
    ...projectInfo,
    framework: null,
    rendererPackage: null,
    renderer: undefined,
  });

  expect(markdown).toContain('your-framework-package');
  expect(markdown).not.toMatch(/react|jsx|tsx|<Story|SessionProvider/i);
});

it('keeps MSW and MockDate optional and installs them separately', async () => {
  vi.stubEnv('EVAL_SETUP_PROMPT', '');
  const { markdown } = await getSetupMarkdownOutput(projectInfo);

  expect(markdown).toContain('Add MSW only if a selected story makes network requests');
  expect(markdown).toContain(
    "Add MockDate only if a selected story's rendered output depends on the current date or time"
  );
  expect(markdown).toContain('If neither condition applies, skip this step');
  expect(markdown).not.toMatch(/npm install[^\n]*msw[^\n]*mockdate/i);
});

it.each([...new Set(PROMPT_NAMES)])(
  'names no Glob or Grep tools and no broken Vitest docs link in the %s prompt',
  async (name) => {
    vi.stubEnv('EVAL_SETUP_PROMPT', name);
    const { markdown } = await getSetupMarkdownOutput(projectInfo);

    expect(markdown).not.toMatch(/\b(Glob|Grep)\b/);
    expect(markdown).not.toContain('writing-tests/vitest-plugin');
  }
);

it('only warns against npx when the project uses another package manager', async () => {
  vi.stubEnv('EVAL_SETUP_PROMPT', '');
  const npm = await getSetupMarkdownOutput(projectInfo);
  const pnpm = await getSetupMarkdownOutput({
    ...projectInfo,
    packageManager: JsPackageManagerFactory.getPackageManager({ force: PackageManagerName.PNPM }),
    packageManagerName: 'pnpm',
  });

  expect(npm.markdown).not.toContain('Do not use `npx`');
  expect(pnpm.markdown).toContain('Do not use `npx`');
});

it('has the agent add the Vitest addon only when the project lacks it', async () => {
  vi.stubEnv('EVAL_SETUP_PROMPT', '');
  const without = await getSetupMarkdownOutput(projectInfo);
  const withAddon = await getSetupMarkdownOutput({
    ...projectInfo,
    addons: ['@storybook/addon-vitest'],
  });

  expect(without.markdown).toContain('npx storybook add @storybook/addon-vitest --yes');
  expect(without.markdown).not.toContain('storybook build');
  expect(withAddon.markdown).not.toContain('storybook add @storybook/addon-vitest');
});

it('only lets the agent delete the examples that storybook init generated', async () => {
  vi.stubEnv('EVAL_SETUP_PROMPT', '');
  const { markdown } = await getSetupMarkdownOutput(projectInfo);

  expect(markdown).toContain('`Configure.mdx` next to `Button`, `Header`, and `Page`');
  expect(markdown).toContain("Don't delete any other stories.");
  expect(markdown).toContain('Never delete, move, or rewrite the stories');
  expect(markdown).toContain('add your stories to that file instead of writing a second one');
});
