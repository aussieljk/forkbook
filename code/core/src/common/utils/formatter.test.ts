import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { formatCode, formatFileContent } from './formatter.ts';

const content = `import type { Meta } from "@storybook/react-vite"
  const meta = { component: "a" } satisfies Meta
export default meta
`;

describe('formatFileContent', () => {
  it('formats with the nearest oxfmt config', async () => {
    const filePath = resolve(__dirname, '__tests-formatter__', 'withConfig', 'testFile.ts');

    expect(await formatFileContent(filePath, content)).toMatchInlineSnapshot(`
      "import type { Meta } from '@storybook/react-vite';
      const meta = { component: 'a' } satisfies Meta;
      export default meta;
      "
    `);
  });

  it('returns the content as is without an oxfmt config', async () => {
    const filePath = join(tmpdir(), 'testFile.ts');

    expect(await formatFileContent(filePath, content)).toBe(content);
  });
});

describe('formatCode', () => {
  it('returns the content as is when it cannot be parsed', async () => {
    expect(await formatCode('file.ts', 'const = ;')).toBe('const = ;');
  });
});
