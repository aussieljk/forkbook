import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { afterEach, expect, it } from 'vitest';

import { join } from 'pathe';

import { writeRoutePages } from './write-route-pages.ts';

let dir: string;
afterEach(() => rm(dir, { recursive: true, force: true }));

it('writes a manager page for each story URL with its depth', async () => {
  dir = await mkdtemp(join(tmpdir(), 'route-pages-'));
  await writeFile(join(dir, 'index.html'), 'depth=/*FORKBOOK_ROUTE_DEPTH*/ 0;');
  const index = {
    v: 5,
    entries: {
      'example-button--primary': {
        id: 'example-button--primary',
        title: 'Example/Button',
        name: 'Primary',
        type: 'story',
        importPath: './Button.stories.tsx',
      },
    },
  } as any;

  await writeRoutePages(dir, index);

  expect(await readFile(join(dir, 'example/button/primary/index.html'), 'utf8')).toBe(
    'depth=/*FORKBOOK_ROUTE_DEPTH*/ 3;'
  );
  expect(await readFile(join(dir, 'settings/about/index.html'), 'utf8')).toBe(
    'depth=/*FORKBOOK_ROUTE_DEPTH*/ 2;'
  );
});
