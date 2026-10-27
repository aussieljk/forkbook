import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isRedirectOnly, pages, routeFromPage } from './pages.ts';

let cwd: string;

async function fixture(files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true });
    await writeFile(join(cwd, path), content);
  }
}

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'forkbook-pages-'));
  await fixture({
    'app/layout.tsx': `export default function RootLayout({ children }) { return <html><body><header />{children}</body></html>; }`,
    'app/page.tsx': `export default function Home() { return <main />; }`,
    'app/(marketing)/about/page.tsx': `export default function About() { return <main />; }`,
    'app/blog/[slug]/page.tsx': `export async function generateStaticParams() { return [{ slug: 'hello' }]; }\nexport default async function Post({ params }) { const { slug } = await params; return <h1>{slug}</h1>; }`,
    'app/old/page.tsx': `import { redirect } from 'next/navigation';\nexport default function Old() { redirect('/'); }`,
    'app/done/page.tsx': `export default function Done() { return <main />; }`,
    'app/done/page.stories.tsx': `// already here`,
  });
});

afterEach(() => rm(cwd, { recursive: true, force: true }));

describe('routeFromPage', () => {
  it('drops route groups and slots', () => {
    expect(routeFromPage('page.tsx')).toBe('/');
    expect(routeFromPage('(shop)/@modal/cart/[id]/page.tsx')).toBe('/cart/[id]');
  });
});

describe('isRedirectOnly', () => {
  it('finds pages that only redirect', () => {
    expect(isRedirectOnly(`export default function P() { permanentRedirect('/x'); }`)).toBe(true);
    expect(
      isRedirectOnly(`export default function P() { if (a) redirect('/x'); return <p />; }`)
    ).toBe(false);
  });
});

describe('pages', () => {
  it('writes one story for each page without stories, and the helper once', async () => {
    const result = await pages({ cwd });

    expect(result.written).toEqual([
      'app/(marketing)/about/page.stories.tsx',
      'app/blog/[slug]/page.stories.tsx',
      'app/page.stories.tsx',
    ]);
    expect(result.skipped).toEqual(['app/old/page.tsx']);
    expect(result.helper).toBe('.forkbook/page.tsx');
    expect(await readFile(join(cwd, 'app/done/page.stories.tsx'), 'utf8')).toBe('// already here');

    const post = await readFile(join(cwd, 'app/blog/[slug]/page.stories.tsx'), 'utf8');
    expect(post).toContain(`import { page } from '../../../.forkbook/page';`);
    expect(post).toContain(`import Page, { generateStaticParams } from './page';`);
    expect(post).toContain(`title: "blog/[slug]",\n  tags: ['!autodocs'],`);
    expect(post).toContain(`...page("/blog/[slug]", Page, { generateStaticParams }),`);
    expect(post).toContain(`export const Default: StoryObj = { name: "[slug]" };`);

    const about = await readFile(join(cwd, 'app/(marketing)/about/page.stories.tsx'), 'utf8');
    expect(about).toContain(`title: "about"`);
    expect(about).toContain(`...page("/about", Page),`);

    expect(await readFile(join(cwd, 'app/page.stories.tsx'), 'utf8')).toContain(`title: "index"`);
    expect(await readFile(join(cwd, '.forkbook/page.tsx'), 'utf8')).toContain(
      `import RootLayout from '../app/layout';`
    );

    const again = await pages({ cwd });
    expect(again.written).toEqual([]);
    expect(again.helper).toBeUndefined();
  });

  it('does not write with dryRun', async () => {
    const result = await pages({ cwd, dryRun: true });

    expect(result.written).toHaveLength(3);
    expect(existsSync(join(cwd, 'app/page.stories.tsx'))).toBe(false);
    expect(existsSync(join(cwd, '.forkbook/page.tsx'))).toBe(false);
  });
});
