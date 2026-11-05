/** Find the props type of a component: from story JSX, the meta `component`, or the module export. */
import {
  type Identifier,
  type Node,
  type SourceFile,
  isIdentifier,
  isImportDeclaration,
  isJsxOpeningElement,
  isJsxSelfClosingElement,
  isNamedImports,
  isNamespaceImport,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isStringLiteral,
} from 'typescript-native/unstable/ast';
import {
  SignatureKind,
  type Symbol as TsSymbol,
  type Type,
  TypeFlags,
} from 'typescript-native/unstable/sync';

import type { ComponentRef } from '../types.ts';
import {
  type Context,
  type ResolvedComponent,
  getDeclaration,
  getExport,
  getProperty,
  resolveAlias,
  resolveComponentSymbol,
  sameSymbol,
  skipWrappers,
} from './symbols.ts';

/** Finds the import of the component in the story file: the local binding and the module symbol. */
export function findImport(
  ctx: Context,
  storyFile: SourceFile,
  ref: ComponentRef
): { local: TsSymbol; module: TsSymbol } | undefined {
  for (const statement of storyFile.statements) {
    if (
      !isImportDeclaration(statement) ||
      !isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== ref.importId ||
      !statement.importClause
    ) {
      continue;
    }
    const module = ctx.checker.getSymbolAtLocation(statement.moduleSpecifier);
    const { name, namedBindings } = statement.importClause;

    let localName: Identifier | undefined;
    if (ref.importName === 'default' && name) {
      localName = name;
    }
    if (!localName && namedBindings && isNamedImports(namedBindings)) {
      const specifier = namedBindings.elements.find(
        (element) => (element.propertyName ?? element.name).text === ref.importName
      );
      localName = specifier?.name;
    }
    // `import * as UI` only matters for `<UI.Button />`, so a namespace import of the same module
    // does not hide a named import that the story uses.
    if (!localName && ref.member && namedBindings && isNamespaceImport(namedBindings)) {
      localName = namedBindings.name;
    }

    const local = localName && ctx.checker.getSymbolAtLocation(localName);
    if (local && module) {
      return { local, module };
    }
  }
  return undefined;
}

/** Path 1: the resolved call signature of the first JSX element of the component. */
export function resolveFromStoryJsx(
  ctx: Context,
  storyFile: SourceFile,
  ref: ComponentRef,
  local: TsSymbol
): ResolvedComponent | undefined {
  let result: ResolvedComponent | undefined;

  const visit = (node: Node): void => {
    if (result) {
      return;
    }
    if (isJsxSelfClosingElement(node) || isJsxOpeningElement(node)) {
      const { tagName } = node;
      const isMatch = ref.member
        ? isPropertyAccessExpression(tagName) &&
          tagName.name.text === ref.member &&
          sameSymbol(ctx.checker.getSymbolAtLocation(tagName.expression), local)
        : isIdentifier(tagName) && sameSymbol(ctx.checker.getSymbolAtLocation(tagName), local);

      const signature = isMatch ? ctx.checker.getResolvedSignature(node) : undefined;
      if (signature) {
        const [propsParameter] = signature.getParameters();
        const member =
          ref.member && isPropertyAccessExpression(tagName)
            ? ctx.checker.getSymbolAtLocation(tagName.name)
            : undefined;
        result = {
          propsType: propsParameter
            ? ctx.checker.getTypeOfSymbolAtLocation(propsParameter, node)
            : undefined,
          symbol: resolveComponentSymbol(ctx, member ?? local),
        };
        return;
      }
    }
    node.forEachChild(visit);
  };

  visit(storyFile);
  return result;
}

/** Path 2: the `component` property of the story file's default export. */
export function resolveFromMetaComponent(
  ctx: Context,
  storyFile: SourceFile,
  ref: ComponentRef,
  local: TsSymbol | undefined
): ResolvedComponent | undefined {
  const module = ctx.checker.getSymbolAtLocation(storyFile);
  const meta = module && getExport(ctx, module, 'default');
  const metaType = meta && ctx.checker.getTypeOfSymbol(meta);
  const componentProperty = metaType && getProperty(ctx, metaType, 'component');
  const declaration = componentProperty && getDeclaration(ctx, componentProperty);
  if (!componentProperty || !declaration || !isPropertyAssignment(declaration)) {
    return undefined;
  }

  // Only the meta component itself, not a declared subcomponent of the same module.
  const initializer = skipWrappers(declaration.initializer);
  const metaName = isIdentifier(initializer)
    ? initializer.text
    : isPropertyAccessExpression(initializer) && isIdentifier(initializer.expression)
      ? `${initializer.expression.text}.${initializer.name.text}`
      : undefined;
  const initializerSymbol = ctx.checker.getSymbolAtLocation(initializer);
  const isMatch =
    !ref.member && local && initializerSymbol
      ? sameSymbol(resolveAlias(ctx, local), resolveAlias(ctx, initializerSymbol))
      : metaName === ref.componentName;
  if (!isMatch || !initializerSymbol) {
    return undefined;
  }

  let componentType = ctx.checker.getTypeOfSymbol(componentProperty);
  let symbol = initializerSymbol;
  if (ref.member && !isPropertyAccessExpression(initializer)) {
    const member = componentType && getProperty(ctx, componentType, ref.member);
    if (!member) {
      return undefined;
    }
    componentType = ctx.checker.getTypeOfSymbol(member);
    symbol = member;
  }

  return resolveFromComponentType(ctx, componentType, resolveComponentSymbol(ctx, symbol));
}

/** Path 3: the export of the component module. */
export function resolveFromModuleExport(
  ctx: Context,
  module: TsSymbol,
  ref: ComponentRef
): ResolvedComponent | undefined {
  const exportName = ref.importName ?? ref.componentName.split('.').at(-1);
  let symbol = exportName ? getExport(ctx, module, exportName) : undefined;
  let componentType = symbol && ctx.checker.getTypeOfSymbol(symbol);

  // With `import * as UI`, the import name is already the member, for example `Button`.
  if (ref.member && !ref.namespace) {
    symbol = componentType && getProperty(ctx, componentType, ref.member);
    componentType = symbol && ctx.checker.getTypeOfSymbol(symbol);
  }

  return (
    symbol && resolveFromComponentType(ctx, componentType, resolveComponentSymbol(ctx, symbol))
  );
}

/**
 * Gets the props from the type of a component: the first parameter of a function component, or the
 * `props` property of a class component instance. This does not work for generic components,
 * because nothing gives a value to the type parameters.
 */
function resolveFromComponentType(
  ctx: Context,
  componentType: Type | undefined,
  symbol: TsSymbol
): ResolvedComponent | undefined {
  if (!componentType) {
    return undefined;
  }
  const isAny = (type: Type | undefined) => !type || !!(type.flags & TypeFlags.Any);

  const [callSignature] = ctx.checker.getSignaturesOfType(componentType, SignatureKind.Call);
  if (callSignature) {
    const [propsParameter] = callSignature.getParameters();
    if (!propsParameter) {
      return { propsType: undefined, symbol };
    }
    const propsType = ctx.checker.getTypeOfSymbol(propsParameter);
    if (!isAny(propsType)) {
      return { propsType, symbol };
    }
  }

  for (const signature of ctx.checker.getSignaturesOfType(componentType, SignatureKind.Construct)) {
    const instanceType = ctx.checker.getReturnTypeOfSignature(signature);
    const props = instanceType && getProperty(ctx, instanceType, 'props');
    const propsType = props && ctx.checker.getTypeOfSymbol(props);
    if (!isAny(propsType)) {
      return { propsType, symbol };
    }
  }
  return undefined;
}
