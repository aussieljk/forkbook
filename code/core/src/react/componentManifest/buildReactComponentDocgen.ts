import { getComponentIdFromEntry } from '@aussieljk/forkbook/internal/common';
import {
  buildImportStatements,
  createStoryReferenceResolver,
  extractComponentDescription,
  extractDescription,
} from '@aussieljk/forkbook/internal/csf-tools';
import type {
  ComponentManifest,
  ComponentSubcomponentManifest,
  IndexEntry,
  StoryDocsPayload,
} from '@aussieljk/forkbook/internal/types';

import path from 'pathe';

import type { ComponentDoc, PropItem } from './componentMeta/componentMetaExtractor.ts';
import type { ComponentRef } from './getComponentImports.ts';
import {
  type ParsedCsf,
  type ResolvedSubcomponent,
  extractStorySnippets,
} from './resolveComponents.ts';
import { cachedFindUp, cachedReadTextFileSync } from './utils.ts';

// One instance per process, so the module-resolution cache is shared; each build opens its own.
const openStoryReferences = createStoryReferenceResolver();

/** React subcomponent manifest with the docgen attached. */
export interface ReactSubcomponentManifest extends ComponentSubcomponentManifest {
  reactComponentMeta?: ComponentDoc;
  [key: string]: unknown;
}

/**
 * React component manifest with the docgen attached.
 *
 * This is the output shape for both the experimental components manifest and the docgen open
 * service provider — there is no separate mapping step between "resolved docgen" and "manifest".
 */
export interface ReactComponentManifest extends ComponentManifest {
  reactComponentMeta?: ComponentDoc;
  subcomponents?: Record<string, ReactSubcomponentManifest>;
  [key: string]: unknown;
}

function getPackageInfo(componentPath: string | undefined, fallbackPath: string) {
  const nearestPkg = cachedFindUp('package.json', {
    cwd: path.dirname(componentPath ?? fallbackPath),
  });

  try {
    if (!nearestPkg) {
      return undefined;
    }

    const parsed = JSON.parse(cachedReadTextFileSync(nearestPkg));
    return typeof parsed === 'object' &&
      parsed &&
      'name' in parsed &&
      typeof parsed.name === 'string'
      ? parsed.name
      : undefined;
  } catch {
    return undefined;
  }
}

function getFallbackImport(packageName: string | undefined, componentName: string | undefined) {
  const exportName = componentName?.split('.').at(-1);
  return packageName && exportName
    ? buildImportStatements({
        refs: [{ importId: packageName, importName: exportName, localImportName: exportName }],
      }).join('\n')
    : '';
}

/**
 * Rewrites the absolute `fileName`s the RCM extractor records on each prop's `parent` /
 * `declarations` into paths relative to the current working directory, so the emitted docgen (both
 * the component manifest and the docgen service) stays portable and machine-independent. Returns a
 * new {@link ComponentDoc}; the cached extractor result is left untouched.
 */
function relativizeComponentMetaPaths(doc: ComponentDoc): ComponentDoc {
  const relativize = (fileName: string) => path.relative(process.cwd(), fileName);
  const relativizeProp = (prop: PropItem): PropItem => ({
    ...prop,
    parent: prop.parent
      ? { ...prop.parent, fileName: relativize(prop.parent.fileName) }
      : prop.parent,
  });

  return {
    ...doc,
    props: Object.fromEntries(
      Object.entries(doc.props).map(([name, prop]) => [name, relativizeProp(prop)])
    ),
  };
}

function getComponentDocgenData(component: ComponentRef | undefined) {
  const reactComponentMeta = component?.reactComponentMeta
    ? relativizeComponentMetaPaths(component.reactComponentMeta)
    : undefined;
  return {
    reactComponentMeta,
    docgenDescription: reactComponentMeta?.description,
    docgenJsDocTags: component?.componentJsDocTags,
  };
}

function createSubcomponentDocgen({
  component,
  declaredName,
  packageName,
  storyFilePath,
}: {
  component: ComponentRef | undefined;
  declaredName: string;
  packageName: string | undefined;
  storyFilePath: string;
}): ReactSubcomponentManifest {
  const imports =
    buildImportStatements({ refs: component ? [component] : [], packageName })
      .join('\n')
      .trim() || getFallbackImport(packageName, component?.componentName);
  const { reactComponentMeta, docgenDescription, docgenJsDocTags } =
    getComponentDocgenData(component);
  const { description, summary, jsDocTags } = extractComponentDescription(
    undefined,
    docgenDescription,
    docgenJsDocTags
  );

  return {
    name: declaredName,
    path: component?.path ?? storyFilePath,
    description,
    summary,
    import: imports || undefined,
    jsDocTags,
    reactComponentMeta,
    error: !component
      ? {
          name: 'No component import found',
          message: `No component file found for the "${declaredName}" subcomponent.`,
        }
      : undefined,
  };
}

/**
 * Builds story snippets, descriptions, and file-level import statements from a parsed CSF file.
 * Used by the story-docs open service and composed into the legacy combined manifest.
 */
export function buildStoryDocsFromResolved({
  entry,
  storyPath,
  storyFilePath,
  csf,
  componentName,
  component,
  allComponents,
  filterStoryIds,
}: {
  entry: IndexEntry;
  storyPath: string;
  storyFilePath: string;
  csf: ParsedCsf;
  componentName: string | undefined;
  component: ComponentRef | undefined;
  allComponents: ComponentRef[];
  /** When set, only stories whose ids are in the set are included (manifest tag filtering). */
  filterStoryIds?: ReadonlySet<string>;
}): StoryDocsPayload {
  const id = getComponentIdFromEntry(entry);
  const title = entry.title.split('/').at(-1)!.replace(/\s+/g, '');

  const packageName = getPackageInfo(component?.path, storyPath);
  const fallbackImport = getFallbackImport(packageName, componentName);
  const storyEntries = extractStorySnippets(
    csf,
    component?.componentName ?? componentName,
    filterStoryIds,
    {
      filePath: storyPath,
      ...openStoryReferences(),
    }
  );
  // An arg value that kept the name another module gave it only compiles once the import block
  // names that module too. `packageName` rewriting is for the component, so those refs opt out of it.
  const argRefs = storyEntries.imports.map((ref) => ({ ...ref, isPackage: true }));
  const imports =
    buildImportStatements({ refs: [...allComponents, ...argRefs], packageName })
      .join('\n')
      .trim() || fallbackImport;

  return {
    id,
    name: componentName ?? title,
    path: storyFilePath,
    ...(imports ? { import: imports } : {}),
    stories: Object.fromEntries(storyEntries.stories.map((story) => [story.id, story])),
  };
}

/**
 * Component docgen fields without story snippets or file-level imports.
 */
// Derive from the base `ComponentManifest` (which has no index signature) rather than
// `Omit<ReactComponentManifest, …>`: `ReactComponentManifest` carries a `[key: string]: unknown`
// index signature (needed so it stays assignable to `DocgenPayload`), and `Omit` over an
// index-signature type collapses to just the index signature, dropping the named props. We re-add
// the React docgen fields and the index signature explicitly.
export type ComponentDocgenFromResolved = Omit<
  ComponentManifest,
  'stories' | 'import' | 'subcomponents'
> & {
  reactComponentMeta?: ComponentDoc;
  subcomponents?: Record<string, ReactSubcomponentManifest>;
  [key: string]: unknown;
};

/**
 * Builds component docgen fields (props, descriptions, subcomponents) without story snippets or
 * file-level imports. Used by the docgen open service.
 */
export function buildComponentDocgenFromResolved({
  entry,
  storyPath,
  storyFilePath,
  storyFile,
  csf,
  componentName,
  component,
  subcomponents,
}: {
  entry: IndexEntry;
  storyPath: string;
  storyFilePath: string;
  storyFile: string;
  csf: ParsedCsf;
  componentName: string | undefined;
  component: ComponentRef | undefined;
  subcomponents: ResolvedSubcomponent[];
}): ComponentDocgenFromResolved {
  const id = getComponentIdFromEntry(entry);
  const title = entry.title.split('/').at(-1)!.replace(/\s+/g, '');
  const packageName = getPackageInfo(component?.path, storyPath);

  const base = {
    id,
    name: componentName ?? title,
    path: storyFilePath,
    jsDocTags: {},
  } satisfies Partial<ComponentDocgenFromResolved>;

  const { reactComponentMeta, docgenDescription, docgenJsDocTags } =
    getComponentDocgenData(component);

  if (!reactComponentMeta) {
    const error = !csf._meta?.component
      ? {
          name: 'No component found',
          message:
            'We could not detect the component from your story file. Specify meta.component.',
        }
      : {
          name: 'No component import found',
          message: `No component file found for the "${csf.meta.component}" component.`,
        };

    return {
      ...base,
      jsDocTags: base.jsDocTags ?? {},
      error: {
        name: error.name,
        message:
          (csf._metaStatementPath?.buildCodeFrameError(error.message).message ?? error.message) +
          `\n\n${entry.importPath}:\n${storyFile}`,
      },
    };
  }

  const metaJsDoc = extractDescription(csf._metaStatement) || undefined;
  const { description, summary, jsDocTags } = extractComponentDescription(
    metaJsDoc,
    docgenDescription,
    docgenJsDocTags
  );
  const subcomponentEntries = Object.fromEntries(
    subcomponents.map((subcomponent) => [
      subcomponent.name,
      createSubcomponentDocgen({
        component: subcomponent.component,
        declaredName: subcomponent.name,
        packageName,
        storyFilePath,
      }),
    ])
  );

  return {
    ...base,
    description,
    summary,
    reactComponentMeta,
    jsDocTags,
    ...(Object.keys(subcomponentEntries).length > 0 ? { subcomponents: subcomponentEntries } : {}),
  };
}

/**
 * Builds resolved React component docgen from a parsed CSF file and index entry. Used by the
 * experimental manifest generator.
 */
export function buildReactComponentDocgenFromResolved({
  entry,
  storyPath,
  storyFilePath,
  storyFile,
  csf,
  componentName,
  component,
  allComponents,
  subcomponents,
  filterStoryIds,
}: {
  entry: IndexEntry;
  storyPath: string;
  storyFilePath: string;
  storyFile: string;
  csf: ParsedCsf;
  componentName: string | undefined;
  component: ComponentRef | undefined;
  allComponents: ComponentRef[];
  subcomponents: ResolvedSubcomponent[];
  /** When set, only stories whose ids are in the set are included (manifest tag filtering). */
  filterStoryIds?: ReadonlySet<string>;
}): ReactComponentManifest {
  const storyDocs = buildStoryDocsFromResolved({
    entry,
    storyPath,
    storyFilePath,
    csf,
    componentName,
    component,
    allComponents,
    filterStoryIds,
  });
  const componentDocgen = buildComponentDocgenFromResolved({
    entry,
    storyPath,
    storyFilePath,
    storyFile,
    csf,
    componentName,
    component,
    subcomponents,
  });

  return {
    ...componentDocgen,
    // Legacy inline manifests keep CSF-ordered arrays; story-docs open-service payloads use Records.
    stories: Object.values(storyDocs.stories),
    ...(storyDocs.import ? { import: storyDocs.import } : {}),
  };
}
