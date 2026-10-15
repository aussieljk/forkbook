import type { Stats } from 'node:fs';
import * as fsp from 'node:fs/promises';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { Feature, SupportedLanguage, SupportedRenderer } from '@aussieljk/forkbook/internal/types';

import { dedent } from 'ts-dedent';

import { configureMain, configurePreview } from './configure.ts';

vi.mock('node:fs/promises');

describe('configureMain', () => {
  beforeAll(() => {
    vi.clearAllMocks();
    vi.mocked(fsp.stat).mockRejectedValue({});
  });

  it('should generate main.js', async () => {
    await configureMain({
      language: SupportedLanguage.JAVASCRIPT,
      addons: [],
      prefixes: [],
      storybookConfigFolder: '.forkbook',
      framework: '@aussieljk/forkbook/react-vite',
      frameworkPackage: '@aussieljk/forkbook/react-vite',
      features: new Set([]),
    });

    const { calls } = vi.mocked(fsp.writeFile).mock;
    const [mainConfigPath, mainConfigContent] = calls[0];

    expect(mainConfigPath).toEqual('./.forkbook/main.js');
    expect(mainConfigContent).toMatchInlineSnapshot(`
      "

      /** @type { import('@aussieljk/forkbook/react-vite').StorybookConfig } */
      const config = {
        "stories": [
          "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
        ],
        "addons": [],
        "framework": "@aussieljk/forkbook/react-vite"
      };
      export default config;"
    `);
  });

  it('should generate main.ts with docs feature', async () => {
    await configureMain({
      language: SupportedLanguage.TYPESCRIPT,
      addons: [],
      prefixes: [],
      storybookConfigFolder: '.forkbook',
      framework: '@aussieljk/forkbook/react-vite',
      frameworkPackage: '@aussieljk/forkbook/react-vite',
      features: new Set([Feature.DOCS]),
    });

    const { calls } = vi.mocked(fsp.writeFile).mock;
    const [mainConfigPath, mainConfigContent] = calls[0];

    expect(mainConfigPath).toEqual('./.forkbook/main.ts');
    expect(mainConfigContent).toMatchInlineSnapshot(`
      "import type { StorybookConfig } from '@aussieljk/forkbook/react-vite';

      const config: StorybookConfig = {
        "stories": [
          "../stories/**/*.mdx",
          "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
        ],
        "addons": [],
        "framework": "@aussieljk/forkbook/react-vite"
      };
      export default config;"
    `);
  });

  it('should generate main.ts without docs feature', async () => {
    await configureMain({
      language: SupportedLanguage.TYPESCRIPT,
      addons: [],
      prefixes: [],
      storybookConfigFolder: '.forkbook',
      framework: '@aussieljk/forkbook/react-vite',
      frameworkPackage: '@aussieljk/forkbook/react-vite',
      features: new Set([]),
    });

    const { calls } = vi.mocked(fsp.writeFile).mock;
    const [mainConfigPath, mainConfigContent] = calls[0];

    expect(mainConfigPath).toEqual('./.forkbook/main.ts');
    expect(mainConfigContent).toMatchInlineSnapshot(`
      "import type { StorybookConfig } from '@aussieljk/forkbook/react-vite';

      const config: StorybookConfig = {
        "stories": [
          "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
        ],
        "addons": [],
        "framework": "@aussieljk/forkbook/react-vite"
      };
      export default config;"
    `);
  });

  it('should handle resolved paths in pnp', async () => {
    await configureMain({
      language: SupportedLanguage.JAVASCRIPT,
      prefixes: [],
      addons: [
        "%%path.dirname(require.resolve(path.join('@aussieljk/forkbook/addon-docs', 'package.json')))%%",
        "%%path.dirname(require.resolve(path.join('@aussieljk/forkbook/addon-links', 'package.json')))%%",
      ],
      storybookConfigFolder: '.forkbook',
      framework:
        "%%path.dirname(require.resolve(path.join('@aussieljk/forkbook/react-vite', 'package.json')))%%",
      frameworkPackage: '@aussieljk/forkbook/react-vite',
      features: new Set([Feature.DOCS]),
    });

    const { calls } = vi.mocked(fsp.writeFile).mock;
    const [mainConfigPath, mainConfigContent] = calls[0];

    expect(mainConfigPath).toEqual('./.forkbook/main.js');
    expect(mainConfigContent).toMatchInlineSnapshot(`
      "import path from 'node:path';

      /** @type { import('@aussieljk/forkbook/react-vite').StorybookConfig } */
      const config = {
        "stories": [
          "../stories/**/*.mdx",
          "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
        ],
        "addons": [
          path.dirname(require.resolve(path.join('@aussieljk/forkbook/addon-docs', 'package.json'))),
          path.dirname(require.resolve(path.join('@aussieljk/forkbook/addon-links', 'package.json')))
        ],
        "framework": path.dirname(require.resolve(path.join('@aussieljk/forkbook/react-vite', 'package.json')))
      };
      export default config;"
    `);
  });
});

describe('configurePreview', () => {
  it('should generate preview.jsx for react-like renderers', async () => {
    await configurePreview({
      language: SupportedLanguage.JAVASCRIPT,
      storybookConfigFolder: '.forkbook',
      frameworkPackage: '@aussieljk/forkbook/react-vite',
      renderer: SupportedRenderer.REACT_NATIVE,
    });

    const { calls } = vi.mocked(fsp.writeFile).mock;
    const [previewConfigPath, previewConfigContent] = calls[0];

    expect(previewConfigPath).toEqual('./.forkbook/preview.jsx');
    expect(previewConfigContent).toMatchInlineSnapshot(`
      "/** @type { import('@aussieljk/forkbook/react-vite').Preview } */
      const preview = {
        parameters: {
          controls: {
            matchers: {
             color: /(background|color)$/i,
             date: /Date$/i,
            },
          },
        },
      };

      export default preview;"
    `);
  });

  it('should generate preview.tsx for TypeScript and react-like renderers', async () => {
    await configurePreview({
      language: SupportedLanguage.TYPESCRIPT,
      storybookConfigFolder: '.forkbook',
      frameworkPackage: '@aussieljk/forkbook/react-vite',
      renderer: SupportedRenderer.REACT,
    });

    const { calls } = vi.mocked(fsp.writeFile).mock;
    const [previewConfigPath, previewConfigContent] = calls[0];

    expect(previewConfigPath).toEqual('./.forkbook/preview.tsx');
    expect(previewConfigContent).toMatchInlineSnapshot(`
      "import type { Preview } from '@aussieljk/forkbook/react-vite'

      const preview: Preview = {
        parameters: {
          controls: {
            matchers: {
             color: /(background|color)$/i,
             date: /Date$/i,
            },
          },
        },
      };

      export default preview;"
    `);
  });

  it('should not do anything if the framework template already included a preview', async () => {
    vi.mocked(fsp.stat).mockResolvedValueOnce({} as Stats);
    await configurePreview({
      language: SupportedLanguage.TYPESCRIPT,
      storybookConfigFolder: '.forkbook',
      frameworkPackage: '@aussieljk/forkbook/react-vite',
      renderer: SupportedRenderer.REACT,
    });
    expect(fsp.writeFile).not.toHaveBeenCalled();
  });

  it('should add prefix if frameworkParts are passed', async () => {
    await configurePreview({
      language: SupportedLanguage.TYPESCRIPT,
      storybookConfigFolder: '.forkbook',
      frameworkPackage: '@aussieljk/forkbook/react-vite',
      frameworkPreviewParts: {
        prefix: dedent`
        import "../src/global.css";
      `,
      },
      renderer: SupportedRenderer.REACT,
    });

    const { calls } = vi.mocked(fsp.writeFile).mock;
    const [previewConfigPath, previewConfigContent] = calls[0];

    expect(previewConfigPath).toEqual('./.forkbook/preview.tsx');
    expect(previewConfigContent).toMatchInlineSnapshot(`
      "import type { Preview } from '@aussieljk/forkbook/react-vite'
      import "../src/global.css";

      const preview: Preview = {
        parameters: {
          controls: {
            matchers: {
             color: /(background|color)$/i,
             date: /Date$/i,
            },
          },
        },
      };

      export default preview;"
    `);
  });
});
