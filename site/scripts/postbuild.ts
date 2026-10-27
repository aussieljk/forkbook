/**
 * Runs after `forkbook build`. For each MDX page in docs/ it writes:
 *
 * - `dist/docs/<path>/index.html`: a clean URL that opens the page in Forkbook. A link in a page
 *   opens in the preview frame, so the redirect changes the top window.
 * - `dist/docs/<path>.md`: the page as plain markdown, for agents.
 *
 * It also writes `dist/llms.txt` (one line for each page) and `dist/llms-full.txt` (all pages).
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { buildStoryPathMap, toUrlPath } from '../../code/core/src/router/story-paths.ts';
import preview from '../.forkbook/preview.ts';

const SITE = 'https://forkbook.ljk.dev';
const site = join(import.meta.dirname, '..');
const dist = join(site, 'dist');

type Entry = { id: string; title: string; name: string; type: string; importPath: string };
type Page = { id: string; title: string; url: string; markdown: string; description: string };

const entries: Entry[] = Object.values(
  JSON.parse(readFileSync(join(dist, 'index.json'), 'utf8')).entries
);

/** `./docs/a/b.mdx` is `/docs/a/b`. An `index.mdx` is the URL of its folder. */
const urlOf = (importPath: string) =>
  ('/' + importPath.slice('./'.length, -'.mdx'.length)).replace(/\/index$/, '');

/** The MDX file without its header (the imports and the `<Meta>` tag). The pages use no other JSX. */
const toMarkdown = (mdx: string) => {
  const lines = mdx.split('\n');
  const meta = lines.findIndex((line) => line.startsWith('<Meta '));
  return (
    lines
      .slice(meta + 1)
      .join('\n')
      .trim() + '\n'
  );
};

/** The first paragraph after the first heading. */
const descriptionOf = (markdown: string) =>
  markdown
    .split(/\n\s*\n/)
    .find((block, i) => i > 0 && !block.startsWith('#') && !block.startsWith('```'))
    ?.replace(/\s+/g, ' ')
    .trim() ?? '';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// The order of the sidebar groups, for llms.txt.
const order: string[] = preview.parameters.options.storySort.order;
const rank = (title: string) => {
  const i = order.indexOf(title.split('/')[0]);
  return i === -1 ? order.length : i;
};

const pages: Page[] = entries
  .filter((entry) => entry.type === 'docs' && entry.importPath.startsWith('./docs/'))
  .sort((a, b) => rank(a.title) - rank(b.title) || a.title.localeCompare(b.title))
  .map((entry) => {
    const markdown = toMarkdown(readFileSync(join(site, entry.importPath), 'utf8'));
    return {
      id: entry.id,
      title: entry.title.split('/').join(' / '),
      url: urlOf(entry.importPath),
      markdown,
      description: descriptionOf(markdown),
    };
  });

const write = (path: string, text: string) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};

// The Forkbook URL of each docs page follows the sidebar tree, for example `/configure/sidebar-and-urls/docs`.
const pathMap = buildStoryPathMap(entries);

for (const page of pages) {
  const target = toUrlPath(`/docs/${page.id}`, pathMap);
  write(join(dist, `${page.url}.md`), page.markdown);
  write(
    join(dist, page.url, 'index.html'),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(page.title)} | Forkbook</title>
<meta name="description" content="${escape(page.description)}">
<link rel="canonical" href="${SITE}${page.url}">
<link rel="alternate" type="text/markdown" href="${page.url}.md">
<script>(window.top || window).location.replace(${JSON.stringify(target)} + location.hash)</script>
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body>
<p><a href="${target}">${escape(page.title)}</a> (markdown: <a href="${page.url}.md">${page.url}.md</a>)</p>
</body>
</html>
`
  );
}

write(
  join(dist, 'llms.txt'),
  `# Forkbook

> Forkbook is a small, fast fork of Storybook for React with Vite, Next.js with Vite and React Native (iOS). It is one npm package: @aussieljk/forkbook.

Each page is also plain markdown: add \`.md\` to its URL. All pages in one file: ${SITE}/llms-full.txt

## Docs

${pages.map((page) => `- [${page.title}](${SITE}${page.url}.md): ${page.description}`).join('\n')}
`
);

write(
  join(dist, 'llms-full.txt'),
  pages.map((page) => `<!-- ${SITE}${page.url} -->\n\n${page.markdown}`).join('\n---\n\n')
);

copyFileSync(join(site, 'vercel.json'), join(dist, 'vercel.json'));

console.log(`Wrote ${pages.length} pages, llms.txt and llms-full.txt.`);
