import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { cssToJs } from './css-modules.ts';

const compile = (name: string, css: string) => {
  const file = join(mkdtempSync(join(tmpdir(), 'css-modules-')), name);
  writeFileSync(file, css);
  return cssToJs(file);
};

describe('cssToJs', () => {
  it('hashes the class names of a CSS module', async () => {
    const js = await compile('a.module.css', '.layout { color: red; }');

    expect(js).toMatch(/export default \{"layout":"fb-[\w-]+-layout"\};/);
  });

  // The manager layout sets `grid-template-areas` inline with plain names. Hashed area names in the
  // CSS put each cell in a new implicit column, and the layout broke.
  it('keeps grid area and line names as they are', async () => {
    const js = await compile(
      'b.module.css',
      '.main { grid-area: content; } .pages { grid-row-start: sidebar-start; grid-column-end: sidebar-end; }'
    );

    expect(js).toContain('grid-area:content');
    expect(js).toContain('sidebar-start');
    expect(js).toContain('sidebar-end');
    expect(js).not.toMatch(/fb-[\w-]+-(content|sidebar)/);
  });

  it('does not hash a plain CSS file', async () => {
    const js = await compile('c.css', '.layout { grid-area: content; }');

    expect(js).toContain('.layout{grid-area:content}');
    expect(js).toContain('export default {};');
  });
});
