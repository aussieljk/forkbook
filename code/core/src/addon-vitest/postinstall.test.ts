import { describe, expect, it, vi } from 'vitest';

import { getTemplateConfigDir, isConfigAlreadySetup } from './postinstall.ts';

vi.mock('storybook/internal/node-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('getTemplateConfigDir', () => {
  it('returns the config dir relative to the generated config file directory', () => {
    // Both inputs are cwd-relative, so the result is independent of the test cwd.
    expect(getTemplateConfigDir('vitest.config.ts', '.storybook')).toBe('.storybook');
  });

  it('does not double the path when the config file lives in a monorepo subproject', () => {
    // `storybook add --config-dir apps/x/.storybook` run from the repo root, with the
    // new vitest.config.ts created inside apps/x.
    expect(getTemplateConfigDir('apps/x/vitest.config.ts', 'apps/x/.storybook')).toBe('.storybook');
  });

  it('keeps a relative climb when the config dir is above the config file', () => {
    expect(getTemplateConfigDir('apps/x/vitest.config.ts', '.storybook')).toBe('../../.storybook');
  });

  it('supports a custom config dir name', () => {
    expect(getTemplateConfigDir('apps/x/vitest.config.ts', 'apps/x/sb-config')).toBe('sb-config');
  });
});

describe('postinstall helpers', () => {
  it('detects a fully configured Vitest config with addon plugin', () => {
    const config = `
      import { defineConfig } from 'vitest/config';
      import { storybookTest } from 'storybook/addon-vitest/vitest-plugin';

      export default defineConfig({
        test: {
          projects: [
            {
              extends: true,
              plugins: [storybookTest({ configDir: '.storybook' })],
            },
          ],
        },
      });
    `;

    expect(isConfigAlreadySetup('/project/vitest.config.ts', config)).toBe(true);
  });

  it('returns false when storybookTest plugin is not used', () => {
    const config = `
      import { defineConfig } from 'vitest/config';

      export default defineConfig({
        test: {
          projects: [
            {
              extends: true,
            },
          ],
        },
      });
    `;

    expect(isConfigAlreadySetup('/project/vitest.config.ts', config)).toBe(false);
  });
});
