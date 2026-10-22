import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import { glob } from 'tinyglobby';

export interface PagesOptions {
  cwd?: string;
  dryRun?: boolean;
}

export interface PagesResult {
  /** Paths of the story files that were written, relative to `cwd`. */
  written: string[];
  /** Pages that only redirect, relative to `cwd`. */
  skipped: string[];
  /** The helper file, when it was written in this run. */
  helper?: string;
}

const HELPER_PATH = '.storybook/page.tsx';

/** `app/(shop)/blog/[slug]/page.tsx` to `/blog/[slug]`. Route groups and slots are not in the URL. */
export function routeFromPage(pagePath: string) {
  const segments = dirname(pagePath)
    .split('/')
    .filter((segment) => segment !== '.' && !/^\(.*\)$/.test(segment) && !segment.startsWith('@'));
  return `/${segments.join('/')}`;
}

/** A page that has no JSX and calls `redirect` or `permanentRedirect` only sends the user on. */
export function isRedirectOnly(source: string) {
  return /\b(redirect|permanentRedirect)\s*\(/.test(source) && !/<[A-Za-z]/.test(source);
}

const hasStaticParams = (source: string) =>
  /export\s+(async\s+)?function\s+generateStaticParams\b|export\s+(const|let)\s+generateStaticParams\b/.test(
    source
  );

const importPath = (from: string, to: string) => {
  const path = relative(dirname(from), to).replace(/\.tsx?$/, '');
  return path.startsWith('.') ? path : `./${path}`;
};

export function pageStory({
  storyPath,
  helperPath,
  route,
  withStaticParams,
}: {
  storyPath: string;
  helperPath: string;
  route: string;
  withStaticParams: boolean;
}) {
  // A title must have letters, and a leading `/` makes an empty sidebar group.
  const title = route === '/' ? 'index' : route.slice(1);
  // The story name is the same as the last title part, so the sidebar shows one item per route.
  const name = title.split('/').at(-1);
  const pageImport = withStaticParams ? 'Page, { generateStaticParams }' : 'Page';
  const options = withStaticParams ? ', { generateStaticParams }' : '';
  return `import type { Meta, StoryObj } from '@aussieljk/forkbook/nextjs-vite';

import { page } from '${importPath(storyPath, helperPath)}';
import ${pageImport} from './page';

const meta = {
  title: ${JSON.stringify(title)},
  tags: ['!autodocs'],
  ...page(${JSON.stringify(route)}, Page${options}),
} satisfies Meta;

export default meta;

export const Default: StoryObj = { name: ${JSON.stringify(name)} };
`;
}

export function pageHelper({
  helperPath,
  layoutPath,
}: {
  helperPath: string;
  layoutPath?: string;
}) {
  const layoutImport = layoutPath
    ? `import RootLayout from '${importPath(helperPath, layoutPath)}';\n`
    : '';
  const layout = layoutPath ? 'RootLayout' : 'undefined';
  return `import { Children, Fragment, cloneElement, isValidElement } from 'react';
import type { ComponentType, ReactNode } from 'react';

${layoutImport}
type Params = Record<string, string | string[]>;

interface PageOptions {
  generateStaticParams?: () => Params[] | Promise<Params[]>;
}

const SLOT = '__forkbook_page_slot__';

const isAsync = (component: unknown) =>
  Object.prototype.toString.call(component) === '[object AsyncFunction]';

/** Puts \`params\` into the dynamic segments of a route: \`/blog/[slug]\` to \`/blog/hello\`. */
function fillRoute(route: string, params: Params) {
  return route.replace(/\\[{1,2}(?:\\.\\.\\.)?([^\\]]+)\\]{1,2}/g, (_, key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value.join('/') : (value ?? key);
  });
}

/** Keeps the layout chrome (header, footer) and removes \`<html>\` and \`<body>\`. */
function chrome(node: ReactNode, page: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      return child;
    }
    if (child.type === SLOT) {
      return page;
    }
    const children = chrome(child.props.children, page);
    if (child.type === 'html' || child.type === 'body') {
      return <Fragment key={child.key}>{children}</Fragment>;
    }
    return child.props.children === undefined ? child : cloneElement(child, undefined, children);
  });
}

/** Makes the meta for a story of a Next.js App Router page. Written by \`forkbook init --pages\`. */
export function page(route: string, Page: ComponentType<any>, options: PageOptions = {}) {
  const Layout: ComponentType<any> | undefined = ${layout};
  return {
    component: Page,
    parameters: {
      layout: 'fullscreen',
      nextjs: { appDirectory: true, navigation: { pathname: route, segments: [] } },
    },
    loaders: [
      async (context: any) => {
        const params = (await options.generateStaticParams?.())?.[0] ?? {};
        // The Next.js decorator reads the navigation parameters when it renders, after the loaders.
        context.parameters.nextjs.navigation = {
          pathname: fillRoute(route, params),
          segments: Object.entries(params),
        };
        const props = { params: Promise.resolve(params), searchParams: Promise.resolve({}) };
        const pageNode = isAsync(Page) ? await Page(props) : <Page {...props} />;
        const slot = <SLOT />;
        const layoutNode = Layout
          ? isAsync(Layout)
            ? await (Layout as any)({ children: slot, params: props.params })
            : (Layout as any)({ children: slot, params: props.params })
          : slot;
        return { pageNode, layoutNode };
      },
    ],
    render: (_args: unknown, { loaded }: any) => chrome(loaded.layoutNode, loaded.pageNode),
  };
}
`;
}

/** Writes a \`page.stories.tsx\` next to each App Router page that has no stories. */
export async function pages({
  cwd = process.cwd(),
  dryRun = false,
}: PagesOptions = {}): Promise<PagesResult> {
  const appDir = ['app', 'src/app'].find((dir) => existsSync(join(cwd, dir)));
  if (!appDir) {
    throw new Error(
      'No `app` or `src/app` folder found. This command is for the Next.js App Router.'
    );
  }

  const result: PagesResult = { written: [], skipped: [] };
  const helperPath = join(cwd, HELPER_PATH);
  const layoutPath = (await glob(`${appDir}/layout.{tsx,jsx,ts,js}`, { cwd, absolute: true }))[0];

  const pageFiles = await glob(`${appDir}/**/page.{tsx,jsx}`, {
    cwd,
    ignore: ['**/node_modules/**'],
  });
  for (const pageFile of pageFiles.sort()) {
    const storyFile = join(cwd, dirname(pageFile), 'page.stories.tsx');
    const existing = await glob('page.stories.*', { cwd: join(cwd, dirname(pageFile)) });
    if (existing.length > 0) {
      continue;
    }
    const source = await readFile(join(cwd, pageFile), 'utf8');
    if (isRedirectOnly(source)) {
      result.skipped.push(pageFile);
      continue;
    }
    const story = pageStory({
      storyPath: storyFile,
      helperPath,
      route: routeFromPage(relative(appDir, pageFile)),
      withStaticParams: hasStaticParams(source),
    });
    result.written.push(relative(cwd, storyFile));
    if (!dryRun) {
      await writeFile(storyFile, story);
    }
  }

  if (result.written.length > 0 && !existsSync(helperPath)) {
    result.helper = HELPER_PATH;
    if (!dryRun) {
      await mkdir(dirname(helperPath), { recursive: true });
      await writeFile(helperPath, pageHelper({ helperPath, layoutPath }));
    }
  }

  return result;
}
