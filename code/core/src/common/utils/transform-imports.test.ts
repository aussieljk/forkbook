import { describe, expect, it } from 'vitest';

import { dedent } from 'ts-dedent';

import { transformImports } from './transform-imports.ts';

const consolidatedPackages = {
  '@storybook/core-common': '@aussieljk/forkbook/internal/common',
  '@storybook/theming': '@aussieljk/forkbook/theming',
  '@storybook/components': '@aussieljk/forkbook/internal/components',
  '@storybook/test': '@aussieljk/forkbook/test',
} as const;

describe('transformImports', () => {
  it('renames import declarations', () => {
    expect(
      transformImports(
        dedent`
          import { something } from '@storybook/components';
          import { other } from '@storybook/core-common';
        `,
        consolidatedPackages
      )
    ).toMatchInlineSnapshot(`
      "import { something } from '@aussieljk/forkbook/internal/components';
      import { other } from '@aussieljk/forkbook/internal/common';"
    `);
  });

  it('does not rename packages that only share a prefix', () => {
    expect(
      transformImports(
        dedent`
          import { a } from '@storybook/test-runner';
          import { b } from '@storybook/test';
        `,
        consolidatedPackages
      )
    ).toMatchInlineSnapshot(`
      "import { a } from '@storybook/test-runner';
      import { b } from '@aussieljk/forkbook/test';"
    `);
  });

  it('keeps sub-paths', () => {
    expect(
      transformImports(`import { other } from '@storybook/theming/create';`, consolidatedPackages)
    ).toMatchInlineSnapshot(`"import { other } from '@aussieljk/forkbook/theming/create';"`);
  });

  it('renames require calls alongside imports', () => {
    expect(
      transformImports(
        dedent`
          import { something } from '@storybook/components';
          const other = require('@storybook/core-common');
        `,
        consolidatedPackages
      )
    ).toMatchInlineSnapshot(`
      "import { something } from '@aussieljk/forkbook/internal/components';
      const other = require('@aussieljk/forkbook/internal/common');"
    `);
  });

  it('returns null when no package matches', () => {
    expect(
      transformImports(
        dedent`
          import { something } from '@storybook/other-package';
          const other = require('some-other-package');
        `,
        consolidatedPackages
      )
    ).toBeNull();
  });
});
