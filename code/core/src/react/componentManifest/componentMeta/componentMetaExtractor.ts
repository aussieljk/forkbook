/**
 * React component docgen on the TypeScript 7 native API (tsgo, the `typescript-native` package).
 *
 * The extractor finds the props type of one component and makes a {@link ComponentDoc} from it. It
 * tries three ways to find the props type, in this order:
 *
 * 1. A JSX element of the component in the story file. The checker resolves the call signature of the
 *    element, so generic and polymorphic components get the props that the story uses.
 * 2. The `component` property of the story file's default export (stories with args only).
 * 3. The export of the component module (declared subcomponents, and component files without a story).
 */
import {
  type JSDocTagInfo,
  type Project,
  SymbolFlags,
  type Symbol as TsSymbol,
} from 'typescript-native/unstable/sync';

import type { ComponentRef } from '../types.ts';
import {
  findImplementation,
  getDefaultPropsDefaults,
  getDestructuringDefaults,
} from './defaultValues.ts';
import {
  findImport,
  resolveFromMetaComponent,
  resolveFromModuleExport,
  resolveFromStoryJsx,
} from './findPropsType.ts';
import {
  getBulkProps,
  getParent,
  getPropSymbols,
  getSourceLiteralOrder,
  serializeType,
} from './props.ts';
import {
  type Context,
  type ResolvedComponent,
  getDeclaration,
  getExport,
  resolveAlias,
  sameSymbol,
} from './symbols.ts';

export interface PropItemType {
  name: string;
  raw?: string;
  value?: { value: string }[];
}

export interface ParentType {
  name: string;
  fileName: string;
}

export interface PropItem {
  name: string;
  required: boolean;
  type: PropItemType;
  description: string;
  defaultValue: { value: string } | null;
  parent?: ParentType;
}

export interface ComponentDoc {
  displayName?: string;
  exportName: string;
  filePath: string;
  description: string;
  jsDocTags?: Record<string, string[]>;
  props: Record<string, PropItem>;
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/** Makes the docgen of a component that a story file imports. */
export function extractComponentDocFromStory(
  project: Project,
  storyPath: string,
  ref: ComponentRef
): ComponentDoc | undefined {
  const storyFile = project.program.getSourceFile(storyPath);
  if (!storyFile || !ref.importName) {
    return undefined;
  }
  const ctx: Context = { project, checker: project.checker };
  const imported = findImport(ctx, storyFile, ref);

  const resolved =
    (imported && resolveFromStoryJsx(ctx, storyFile, ref, imported.local)) ??
    resolveFromMetaComponent(ctx, storyFile, ref, imported?.local) ??
    (imported && resolveFromModuleExport(ctx, imported.module, ref));

  return resolved && serializeComponentDoc(ctx, resolved, ref.importName, ref, imported?.module);
}

/** Makes the docgen of a component that a module exports, when no story file is available. */
export function extractComponentDocFromFile(
  project: Project,
  filePath: string,
  exportName = 'default'
): ComponentDoc | undefined {
  const sourceFile = project.program.getSourceFile(filePath);
  const ctx: Context = { project, checker: project.checker };
  const module = sourceFile && ctx.checker.getSymbolAtLocation(sourceFile);
  if (!module) {
    return undefined;
  }
  const ref: ComponentRef = { componentName: exportName, importName: exportName, isPackage: false };
  const resolved = resolveFromModuleExport(ctx, module, ref);
  return (
    resolved && serializeComponentDoc(ctx, resolved, exportName, { ...ref, path: filePath }, module)
  );
}

// Component doc
// ---------------------------------------------------------------------------

function getJsDocTags(ctx: Context, symbol: TsSymbol): Record<string, string[]> {
  const tags: Record<string, string[]> = {};
  for (const tag of ctx.checker.getJsDocTagsOfSymbol(symbol)) {
    (tags[tag.name] ??= []).push((tag.text ?? '').trim());
  }
  return tags;
}

/**
 * The JSDoc comment of a prop with its tags, for example `The label.\n@deprecated Use children`.
 * The argTypes conversion reads `@deprecated`, `@param` and `@returns` from this text.
 */
function getPropDescription(ctx: Context, prop: TsSymbol, tags: readonly JSDocTagInfo[]) {
  const comment = ctx.checker.getDocumentationCommentOfSymbol(prop);
  const tagLines = tags.map(({ name, text }) => (text ? `@${name} ${text}` : `@${name}`));
  return [comment, ...tagLines].filter(Boolean).join('\n');
}

function serializeComponentDoc(
  ctx: Context,
  { propsType, symbol }: ResolvedComponent,
  exportName: string,
  ref: ComponentRef,
  /** The module that the story imports the component from. */
  importedModule: TsSymbol | undefined
): ComponentDoc | undefined {
  const component = resolveAlias(ctx, symbol);
  const location = getDeclaration(ctx, component);
  if (!location) {
    return undefined;
  }

  const implementation = findImplementation(ctx, component);
  const defaults = getDestructuringDefaults(ctx, implementation);
  for (const [name, value] of getDefaultPropsDefaults(ctx, implementation)) {
    if (!defaults.has(name)) {
      defaults.set(name, value);
    }
  }

  const propSymbols = propsType ? getPropSymbols(ctx, propsType, location) : [];
  const bulkProps = getBulkProps(
    ctx,
    propSymbols.map(({ symbol: prop }) => prop)
  );

  const props: Record<string, PropItem> = {};
  for (const { symbol: prop, forceOptional, type } of propSymbols) {
    if (bulkProps.has(prop.name)) {
      continue;
    }
    const tags = ctx.checker.getJsDocTagsOfSymbol(prop);
    if (tags.some((tag) => tag.name === 'ignore')) {
      continue;
    }
    const required = !(prop.flags & SymbolFlags.Optional) && !forceOptional;
    const propType = type ?? ctx.checker.getTypeOfSymbolAtLocation(prop, location);
    const jsDocDefault = tags.find((tag) => tag.name === 'default' || tag.name === 'defaultValue');
    const defaultValue = defaults.get(prop.name) ?? (jsDocDefault?.text?.trim() || undefined);

    props[prop.name] = {
      name: prop.name,
      required,
      type: serializeType(ctx, propType, required, () => getSourceLiteralOrder(ctx, prop)),
      description: getPropDescription(ctx, prop, tags),
      defaultValue: defaultValue !== undefined ? { value: defaultValue } : null,
      parent: getParent(ctx, prop),
    };
  }

  // The `@import` tag can be on the export (`export { Button }`) instead of on the component.
  const jsDocTags = getJsDocTags(ctx, component);
  const sourceFile = location.getSourceFile();
  const module = importedModule ?? ctx.checker.getSymbolAtLocation(sourceFile);
  const exportSymbol = module && getExport(ctx, module, exportName);
  if (!jsDocTags.import && exportSymbol && !sameSymbol(exportSymbol, component)) {
    const exportTags = getJsDocTags(ctx, resolveAlias(ctx, exportSymbol));
    if (exportTags.import) {
      jsDocTags.import = exportTags.import;
    }
  }

  const ownName =
    component.name !== 'default' && !component.name.startsWith('__') ? component.name : undefined;
  const displayName =
    (ref.member ? ref.componentName : undefined) ??
    (exportSymbol && exportName !== 'default' ? exportName : ownName) ??
    ref.componentName;

  return {
    displayName,
    exportName,
    filePath: ref.path ?? sourceFile.fileName,
    description: ctx.checker.getDocumentationCommentOfSymbol(component),
    jsDocTags,
    props,
  };
}
