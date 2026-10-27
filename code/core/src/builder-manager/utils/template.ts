import { readFile } from 'node:fs/promises';

import type { DocsOptions, Options, Ref, TagsOptions } from '@aussieljk/forkbook/internal/types';

import { render } from 'ejs';
import { join } from 'pathe';

import { resolvePackageDir } from '../../shared/utils/module.ts';

export const getTemplatePath = (template: string) => {
  return join(resolvePackageDir('@aussieljk/forkbook'), 'assets/server', template);
};

export const readTemplate = async (template: string) => {
  const path = getTemplatePath(template);

  return readFile(path, { encoding: 'utf8' });
};

export async function getManagerMainTemplate() {
  return getTemplatePath(`manager.ejs`);
}

export const customHeadHasFavicon = (head: string) => {
  const linkTags = head.match(/<link\b[^>]*>/gi) || [];

  return linkTags.some((tag) => {
    const rel = tag.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const value = rel?.[1] || rel?.[2] || rel?.[3] || '';

    return value.split(/\s+/).some((token) => token.toLowerCase() === 'icon');
  });
};

export const renderHTML = async (
  template: Promise<string>,
  title: Promise<string | false>,
  favicon: Promise<string>,
  customHead: Promise<string | false>,
  cssFiles: string[],
  jsFiles: string[],
  features: Promise<Record<string, any>>,
  refs: Promise<Record<string, Ref>>,
  logLevel: Promise<string>,
  docsOptions: Promise<DocsOptions>,
  tagsOptions: Promise<TagsOptions>,
  { versionCheck, configType }: Options,
  globals: Record<string, any>
) => {
  const titleRef = await title;
  const templateRef = await template;
  const headRef = (await customHead) || '';
  const stringifiedGlobals = Object.entries(globals).reduce(
    (transformed, [key, value]) => ({ ...transformed, [key]: JSON.stringify(value) }),
    {}
  );

  return render(templateRef, {
    title: titleRef ? `${titleRef} - Forkbook` : 'Forkbook',
    files: { js: jsFiles, css: cssFiles },
    favicon: customHeadHasFavicon(headRef) ? '' : await favicon,
    globals: {
      FEATURES: JSON.stringify(await features, null, 2),
      REFS: JSON.stringify(await refs, null, 2),
      LOGLEVEL: JSON.stringify(await logLevel, null, 2),
      DOCS_OPTIONS: JSON.stringify(await docsOptions, null, 2),
      CONFIG_TYPE: JSON.stringify(await configType, null, 2),
      // Opt-in via FORKBOOK_DOCGEN_STORY_PREPARED: request server docgen for the Controls panel at
      // STORY_PREPARED instead of the default STORY_RENDERED. See useStoryDocgenGateReady.
      DOCGEN_STORY_PREPARED: JSON.stringify(process.env.FORKBOOK_DOCGEN_STORY_PREPARED === 'true'),
      // These two need to be double stringified because the UI expects a string
      VERSIONCHECK: JSON.stringify(JSON.stringify(versionCheck), null, 2),
      TAGS_OPTIONS: JSON.stringify(await tagsOptions, null, 2),
      ...stringifiedGlobals,
    },
    head: headRef,
  });
};

/**
 * Sets the number of path segments of the page URL in the manager HTML. The page uses it to find
 * the Forkbook root when it is opened at a story path, for example `/example/button/primary`.
 */
export const withRouteDepth = (html: string, depth: number) =>
  html.replace('/*FORKBOOK_ROUTE_DEPTH*/ 0', `/*FORKBOOK_ROUTE_DEPTH*/ ${depth}`);
