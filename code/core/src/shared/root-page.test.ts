import { describe, expect, it } from 'vitest';

import { resolveRootPage, rootMdxPath } from './root-page.ts';

const dirs = { configDir: '/project/.forkbook', workingDir: '/project' };

describe('rootMdxPath', () => {
  it('resolves the MDX file from the config folder', () => {
    expect(rootMdxPath({ mdx: './Home.mdx' }, dirs.configDir)).toBe('/project/.forkbook/Home.mdx');
    expect(rootMdxPath({ mdx: '../docs/Home.mdx' }, dirs.configDir)).toBe('/project/docs/Home.mdx');
  });

  it('gives undefined when there is no MDX file', () => {
    expect(rootMdxPath(undefined, dirs.configDir)).toBeUndefined();
    expect(rootMdxPath(false, dirs.configDir)).toBeUndefined();
    expect(rootMdxPath({ mode: 'replace' }, dirs.configDir)).toBeUndefined();
  });
});

describe('resolveRootPage', () => {
  it('turns the start page off with `false`', () => {
    expect(resolveRootPage(false, dirs)).toEqual({ enabled: false, mode: 'above' });
  });

  it('is on with the `above` mode by default', () => {
    expect(resolveRootPage(undefined, dirs)).toEqual({ enabled: true, mode: 'above' });
    expect(resolveRootPage({}, dirs)).toEqual({ enabled: true, mode: 'above' });
  });

  it('keeps the `replace` mode', () => {
    expect(resolveRootPage({ mode: 'replace' }, dirs)).toEqual({ enabled: true, mode: 'replace' });
  });

  it('gives the index import path of the MDX file', () => {
    expect(resolveRootPage({ mdx: './Home.mdx', mode: 'replace' }, dirs)).toEqual({
      enabled: true,
      mode: 'replace',
      mdxImportPath: './.forkbook/Home.mdx',
    });
    expect(resolveRootPage({ mdx: '../docs/Home.mdx' }, dirs).mdxImportPath).toBe(
      './docs/Home.mdx'
    );
  });

  it('keeps a path outside the working folder relative', () => {
    expect(
      resolveRootPage({ mdx: './Home.mdx' }, { configDir: '/other', workingDir: '/project' })
        .mdxImportPath
    ).toBe('../other/Home.mdx');
  });
});
