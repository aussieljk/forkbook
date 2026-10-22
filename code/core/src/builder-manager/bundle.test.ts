import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { bundleManagerEntries, describeManagerEntry } from './bundle.ts';

let dir: string;

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function setUp() {
  dir = await mkdtemp(join(tmpdir(), 'fb-manager-'));
  const addonFile = join(dir, 'node_modules/@aussieljk/forkbook/dist/addon-a11y/manager.js');
  await mkdir(join(addonFile, '..'), { recursive: true });
  const wrapper = join(dir, 'cache/addon-a11y-0/manager-bundle.js');
  await mkdir(join(wrapper, '..'), { recursive: true });
  await writeFile(wrapper, `import '${addonFile}';`);
  return { addonFile, wrapper };
}

describe('describeManagerEntry', () => {
  it('gives the real file and the addon that owns it', async () => {
    const { addonFile, wrapper } = await setUp();
    expect(await describeManagerEntry(wrapper)).toEqual({
      file: addonFile,
      owner: '@aussieljk/forkbook/addon-a11y',
    });
  });
});

describe('bundleManagerEntries', () => {
  it('gives the entry path and the addon when a build fails', async () => {
    const { addonFile, wrapper } = await setUp();
    await writeFile(addonFile, `import { missing } from './other.js';\nconsole.log(missing);`);
    await writeFile(join(addonFile, '../other.js'), `export const present = 1;`);

    await expect(
      bundleManagerEntries({
        entryPoints: [wrapper],
        outdir: join(dir, 'out'),
        tsconfig: join(dir, 'tsconfig.json'),
        minify: false,
        define: {},
      } as any)
    ).rejects.toThrow(
      `Could not build the manager entry ${addonFile} (from @aussieljk/forkbook/addon-a11y)`
    );
  });
});
