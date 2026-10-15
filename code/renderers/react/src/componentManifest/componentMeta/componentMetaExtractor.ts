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
  type ArrowFunction,
  type Expression,
  type FunctionDeclaration,
  type FunctionExpression,
  type Identifier,
  type Node,
  type ObjectBindingPattern,
  type ObjectLiteralExpression,
  type SourceFile,
  SyntaxKind,
  isArrowFunction,
  isAsExpression,
  isAwaitExpression,
  isBinaryExpression,
  isBindingElement,
  isBlock,
  isCallExpression,
  isClassDeclaration,
  isConditionalExpression,
  isEnumDeclaration,
  isEnumMember,
  isExportAssignment,
  isExpressionStatement,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isImportDeclaration,
  isInterfaceDeclaration,
  isJsxOpeningElement,
  isJsxSelfClosingElement,
  isLiteralTypeNode,
  isNamedImports,
  isNamespaceImport,
  isNewExpression,
  isNonNullExpression,
  isNumericLiteral,
  isObjectBindingPattern,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isPropertyDeclaration,
  isSatisfiesExpression,
  isShorthandPropertyAssignment,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeReferenceNode,
  isUnionTypeNode,
  isVariableDeclaration,
  isVariableStatement,
} from 'typescript-native/unstable/ast';
import {
  type Checker,
  type JSDocTagInfo,
  type NodeHandle,
  type Project,
  SignatureKind,
  SymbolFlags,
  type Symbol as TsSymbol,
  type Type,
  type LiteralType,
  TypeFlags,
  isUnionType,
} from 'typescript-native/unstable/sync';

import type { ComponentRef } from '../types.ts';

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

/**
 * Props from one `.d.ts` or `node_modules` file (or one interface there) above this count are not
 * documented. This removes the HTML attribute interfaces (more than 100 props) and generated CSS
 * prop types, and keeps the props that the user wrote.
 */
const LARGE_SOURCE_THRESHOLD = 30;

/** Max depth when the extractor follows wrappers (memo, forwardRef, Object.assign) and aliases. */
const MAX_DEPTH = 5;

interface Context {
  project: Project;
  checker: Checker;
}

/** The props type of a component and the symbol that declares the component. */
interface ResolvedComponent {
  /** `undefined` when the component takes no props. */
  propsType: Type | undefined;
  symbol: TsSymbol;
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

// ---------------------------------------------------------------------------
// Symbol and node helpers
// ---------------------------------------------------------------------------

function resolveAlias(ctx: Context, symbol: TsSymbol): TsSymbol {
  if (!(symbol.flags & SymbolFlags.Alias)) {
    return symbol;
  }
  const target = ctx.checker.getAliasedSymbol(symbol);
  return ctx.checker.isUnknownSymbol(target) ? symbol : target;
}

function resolveHandle(ctx: Context, handle: NodeHandle | undefined): Node | undefined {
  return handle?.resolve(ctx.project);
}

function getDeclaration(ctx: Context, symbol: TsSymbol): Node | undefined {
  return resolveHandle(ctx, symbol.valueDeclaration ?? symbol.declarations[0]);
}

function getDeclarations(ctx: Context, symbol: TsSymbol): Node[] {
  return symbol.declarations.flatMap((handle) => resolveHandle(ctx, handle) ?? []);
}

function sameSymbol(a: TsSymbol | undefined, b: TsSymbol | undefined) {
  return !!a && !!b && a.id === b.id;
}

function getExport(ctx: Context, module: TsSymbol, name: string) {
  return ctx.checker.getExportsOfModule(module).find((symbol) => symbol.name === name);
}

function getProperty(ctx: Context, type: Type, name: string) {
  return ctx.checker.getPropertyOfType(type, name);
}

/** Removes parentheses, `as`, `satisfies` and `!` around an expression. */
function skipWrappers(node: Expression): Expression {
  let current = node;
  while (
    isParenthesizedExpression(current) ||
    isAsExpression(current) ||
    isSatisfiesExpression(current) ||
    isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * Follows a symbol to the declaration that holds the component's JSDoc and defaults. Member symbols
 * (`{ Root }`, `Button.Aligner = Aligner`, `Aligner: typeof Aligner`) and anonymous function symbols
 * point to the component only indirectly.
 */
function resolveComponentSymbol(ctx: Context, symbol: TsSymbol, depth = 0): TsSymbol {
  let resolved = resolveAlias(ctx, symbol);
  if (depth > MAX_DEPTH) {
    return resolved;
  }

  let declaration = getDeclaration(ctx, resolved);

  // `const Button = () => ...`: the arrow function symbol is anonymous, use the variable.
  if (
    declaration &&
    (isArrowFunction(declaration) || isFunctionExpression(declaration)) &&
    isVariableDeclaration(declaration.parent) &&
    isIdentifier(declaration.parent.name)
  ) {
    const variable = ctx.checker.getSymbolAtLocation(declaration.parent.name);
    if (variable) {
      resolved = resolveAlias(ctx, variable);
      declaration = getDeclaration(ctx, resolved);
    }
  }

  if (!declaration) {
    return resolved;
  }

  let next: TsSymbol | undefined;
  if (isShorthandPropertyAssignment(declaration)) {
    next = ctx.checker.getShorthandAssignmentValueSymbol(declaration);
  } else if (isPropertyAssignment(declaration)) {
    next = ctx.checker.getSymbolAtLocation(skipWrappers(declaration.initializer));
  } else if (
    isBinaryExpression(declaration) &&
    declaration.operatorToken.kind === SyntaxKind.EqualsToken
  ) {
    next = ctx.checker.getSymbolAtLocation(skipWrappers(declaration.right));
  } else if (
    declaration.kind === SyntaxKind.PropertySignature ||
    isPropertyDeclaration(declaration)
  ) {
    // `Aligner: typeof Aligner` - use the symbol of the property type.
    next = ctx.checker.getTypeOfSymbol(resolved)?.getSymbol();
  }

  if (next && !sameSymbol(resolveAlias(ctx, next), resolved)) {
    return resolveComponentSymbol(ctx, next, depth + 1);
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Find the props type
// ---------------------------------------------------------------------------

/** Finds the import of the component in the story file: the local binding and the module symbol. */
function findImport(
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
function resolveFromStoryJsx(
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
function resolveFromMetaComponent(
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
function resolveFromModuleExport(
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PropSymbol {
  symbol: TsSymbol;
  /** Set when a union member makes the prop optional. */
  forceOptional: boolean;
  /** For union props: the type of the prop over all union members. */
  type?: Type;
}

/**
 * Gets all props of the props type. For a union of props types (for example `ControlledProps |
 * UncontrolledProps`) the extractor takes the props of all members, because the checker gives only
 * the props that all members have. A prop that is optional, `never` or missing in one member is
 * optional.
 */
function getPropSymbols(ctx: Context, propsType: Type, location: Node): PropSymbol[] {
  const members = isUnionType(propsType) ? propsType.getTypes() : [];
  if (members.length === 0) {
    const apparent = ctx.checker.getApparentType(propsType) ?? propsType;
    return ctx.checker
      .getPropertiesOfType(apparent)
      .map((symbol) => ({ symbol, forceOptional: false }));
  }

  const isDegraded = (symbol: TsSymbol) =>
    !!(
      ctx.checker.getTypeOfSymbolAtLocation(symbol, location).flags &
      (TypeFlags.Never | TypeFlags.Undefined)
    );

  const props = new Map<string, PropSymbol & { count: number; degraded: boolean }>();
  for (const member of members) {
    for (const symbol of ctx.checker.getPropertiesOfType(member)) {
      const degraded = isDegraded(symbol);
      const optional = !!(symbol.flags & SymbolFlags.Optional) || degraded;
      const existing = props.get(symbol.name);
      if (!existing) {
        props.set(symbol.name, { symbol, forceOptional: optional, count: 1, degraded });
        continue;
      }
      existing.count++;
      existing.forceOptional ||= optional;
      if (existing.degraded && !degraded) {
        Object.assign(existing, { symbol, degraded });
      }
    }
  }

  return [...props.values()].map(({ symbol, forceOptional, count }) => {
    const unionProperty = getProperty(ctx, propsType, symbol.name);
    return {
      symbol,
      forceOptional: forceOptional || count < members.length,
      type: unionProperty && ctx.checker.getTypeOfSymbolAtLocation(unionProperty, location),
    };
  });
}

function getParent(ctx: Context, prop: TsSymbol): ParentType | undefined {
  let node: Node | undefined = resolveHandle(ctx, prop.declarations[0])?.parent;
  while (node) {
    if (isInterfaceDeclaration(node) || isTypeAliasDeclaration(node)) {
      return { name: node.name.text, fileName: node.getSourceFile().fileName };
    }
    node = node.parent;
  }
  return undefined;
}

const isLibraryPath = (path: string) => path.includes('node_modules') || path.endsWith('.d.ts');

/**
 * Finds the props that come from a large `node_modules` or `.d.ts` source (see
 * {@link LARGE_SOURCE_THRESHOLD}). A prop that the user also declares in their own code stays.
 */
function getBulkProps(ctx: Context, props: TsSymbol[]): Set<string> {
  const candidates = props.flatMap((prop) => {
    const paths = prop.declarations.map((declaration) => declaration.path as string);
    if (paths.length === 0 || !paths.every(isLibraryPath)) {
      return [];
    }
    // A module augmentation (for example Next.js adds `tw` to React's HTMLAttributes) declares one
    // prop in its own file, so the extractor also counts the interface that the prop extends.
    return [{ name: prop.name, source: paths[0], parent: getParent(ctx, prop)?.name }];
  });

  const count = (keys: (string | undefined)[]) => {
    const counts = new Map<string, number>();
    for (const key of keys) {
      if (key) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  };
  const bySource = count(candidates.map(({ source }) => source));
  const byParent = count(candidates.map(({ parent }) => parent));
  const isBulk = (counts: Map<string, number>, key: string | undefined) =>
    !!key && (counts.get(key) ?? 0) > LARGE_SOURCE_THRESHOLD;

  return new Set(
    candidates
      .filter(({ source, parent }) => isBulk(bySource, source) || isBulk(byParent, parent))
      .map(({ name }) => name)
  );
}

/**
 * The order of the members of a literal union in the source code. The tsgo checker sorts union
 * members, so `'small' | 'large'` comes back as `"large" | "small"`. The extractor uses the type
 * node of the prop declaration (and type aliases that it refers to) to get the order back.
 */
function getSourceLiteralOrder(ctx: Context, prop: TsSymbol): string[] {
  const texts: string[] = [];
  const visit = (node: Node | undefined, depth: number): void => {
    if (!node || depth > MAX_DEPTH) {
      return;
    }
    if (isUnionTypeNode(node)) {
      node.types.forEach((type) => visit(type, depth + 1));
    } else if (isLiteralTypeNode(node)) {
      texts.push(node.literal.getText());
    } else if (isTypeReferenceNode(node)) {
      const symbol = ctx.checker.getSymbolAtLocation(node.typeName);
      const alias = symbol && getDeclaration(ctx, resolveAlias(ctx, symbol));
      if (alias && isTypeAliasDeclaration(alias)) {
        visit(alias.type, depth + 1);
      }
      if (alias && isEnumDeclaration(alias)) {
        alias.members.forEach((member) => visit(member.initializer, depth + 1));
      }
    } else if (isStringLiteral(node) || isNumericLiteral(node)) {
      texts.push(node.getText());
    }
  };
  const declaration = getDeclaration(ctx, prop);
  if (declaration && 'type' in declaration) {
    visit(declaration.type as Node | undefined, 0);
  }
  // Single and double quotes give the same literal.
  return texts.map((text) => text.replace(/^'(.*)'$/s, (_, value) => JSON.stringify(value)));
}

function serializeType(
  ctx: Context,
  type: Type,
  required: boolean,
  sourceOrder: () => string[],
  depth = 0
): PropItemType {
  const { checker } = ctx;
  if (depth > MAX_DEPTH) {
    return { name: checker.typeToString(type) };
  }

  if (isUnionType(type)) {
    const all = type.getTypes();
    const members = all.filter((member) => !(member.flags & TypeFlags.Undefined));

    // `boolean` is the union `true | false`. Optional props add `| undefined`.
    if (
      members.length === 2 &&
      members.every((member) => member.flags & TypeFlags.BooleanLiteral)
    ) {
      return { name: 'boolean' };
    }

    const literals = members.filter(
      (member): member is LiteralType =>
        !!(member.flags & (TypeFlags.StringLiteral | TypeFlags.NumberLiteral))
    );
    if (literals.length > 0 && literals.length === members.length) {
      const order = sourceOrder();
      const position = (member: LiteralType) => {
        const index = order.indexOf(JSON.stringify(member.value));
        return index === -1 ? order.length : index;
      };
      const sorted = [...literals].sort((a, b) => position(a) - position(b));
      return {
        name: 'enum',
        raw: sorted.map((member) => checker.typeToString(member)).join(' | '),
        value: sorted.map((member) => ({ value: JSON.stringify(member.value) })),
      };
    }

    // An optional prop with one other type: show that type without `| undefined`.
    if (!required && members.length === 1 && members.length < all.length) {
      return { name: checker.typeToString(members[0]) };
    }
  }

  if (type.flags & TypeFlags.TypeParameter) {
    const constraint = checker.getBaseConstraintOfType(type);
    if (constraint && constraint.id !== type.id) {
      return serializeType(ctx, constraint, required, sourceOrder, depth + 1);
    }
  }

  return { name: checker.typeToString(type) };
}

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

type FunctionLike = ArrowFunction | FunctionExpression | FunctionDeclaration;

function isFunctionLike(node: Node): node is FunctionLike {
  return isArrowFunction(node) || isFunctionExpression(node) || isFunctionDeclaration(node);
}

/** Finds the function of a component through `forwardRef`, `memo`, `Object.assign` and variables. */
function findFunction(ctx: Context, node: Node | undefined, depth = 0): FunctionLike | undefined {
  if (!node || depth > MAX_DEPTH) {
    return undefined;
  }
  if (isFunctionLike(node)) {
    return node;
  }
  if (isParenthesizedExpression(node) || isAsExpression(node) || isSatisfiesExpression(node)) {
    return findFunction(ctx, node.expression, depth + 1);
  }
  if (isCallExpression(node)) {
    for (const argument of node.arguments) {
      const fn = findFunction(ctx, argument, depth + 1);
      if (fn) {
        return fn;
      }
    }
    return undefined;
  }
  if (isIdentifier(node)) {
    const symbol = ctx.checker.getSymbolAtLocation(node);
    const declaration = symbol && getDeclaration(ctx, resolveAlias(ctx, symbol));
    if (declaration && isVariableDeclaration(declaration)) {
      return findFunction(ctx, declaration.initializer, depth + 1);
    }
    if (declaration && isFunctionDeclaration(declaration)) {
      return declaration;
    }
  }
  return undefined;
}

/** Gets the source text of a default value. Constants and enum members give their literal value. */
function resolveLiteral(ctx: Context, node: Expression, depth = 0): string {
  if (depth > MAX_DEPTH || !(isIdentifier(node) || isPropertyAccessExpression(node))) {
    return node.getText();
  }
  if (isIdentifier(node) && node.text === 'undefined') {
    return 'undefined';
  }
  return resolveSymbolLiteral(ctx, ctx.checker.getSymbolAtLocation(node), node.getText(), depth);
}

function resolveSymbolLiteral(
  ctx: Context,
  symbol: TsSymbol | undefined,
  text: string,
  depth = 0
): string {
  const declaration = symbol && getDeclaration(ctx, resolveAlias(ctx, symbol));
  const initializer =
    declaration &&
    (isVariableDeclaration(declaration) ||
      isEnumMember(declaration) ||
      isBindingElement(declaration) ||
      isPropertyAssignment(declaration))
      ? declaration.initializer
      : undefined;
  return initializer ? resolveLiteral(ctx, initializer, depth + 1) : text;
}

function collectBindingDefaults(
  ctx: Context,
  pattern: ObjectBindingPattern,
  defaults: Map<string, string>
) {
  for (const element of pattern.elements) {
    if (element.initializer && element.name) {
      const name = (element.propertyName ?? element.name).getText();
      defaults.set(name, resolveLiteral(ctx, element.initializer));
    }
  }
}

/** Whether an expression reads the props parameter, for example `props` or `useProps(props)`. */
function readsProps(ctx: Context, node: Expression, props: TsSymbol): boolean {
  const expression = skipWrappers(node);
  if (isIdentifier(expression)) {
    return sameSymbol(ctx.checker.getSymbolAtLocation(expression), props);
  }
  if (isAwaitExpression(expression)) {
    return readsProps(ctx, expression.expression, props);
  }
  if (isBinaryExpression(expression)) {
    return readsProps(ctx, expression.left, props) || readsProps(ctx, expression.right, props);
  }
  if (isConditionalExpression(expression)) {
    return (
      readsProps(ctx, expression.whenTrue, props) || readsProps(ctx, expression.whenFalse, props)
    );
  }
  if (isCallExpression(expression) || isNewExpression(expression)) {
    return expression.arguments?.some((argument) => readsProps(ctx, argument, props)) ?? false;
  }
  return false;
}

/**
 * Gets defaults from destructuring: `({ size = 'md' }) => ...` and `(props) => { const { size =
 * 'md' } = props }`.
 */
function getDestructuringDefaults(ctx: Context, component: TsSymbol): Map<string, string> {
  const defaults = new Map<string, string>();
  const declarations = getDeclarations(ctx, component);
  const declaration = getDeclaration(ctx, component);

  let fn: FunctionLike | undefined;
  if (declaration && isFunctionDeclaration(declaration)) {
    // For overloads, the implementation is the declaration with a body.
    fn = declarations.find(
      (node): node is FunctionDeclaration => isFunctionDeclaration(node) && !!node.body
    );
  } else if (declaration && isVariableDeclaration(declaration)) {
    fn = findFunction(ctx, declaration.initializer);
  } else if (declaration && isExportAssignment(declaration)) {
    fn = findFunction(ctx, declaration.expression);
  }

  const [propsParameter] = fn?.parameters ?? [];
  if (!fn || !propsParameter) {
    return defaults;
  }
  if (isObjectBindingPattern(propsParameter.name)) {
    collectBindingDefaults(ctx, propsParameter.name, defaults);
    return defaults;
  }

  const props = isIdentifier(propsParameter.name)
    ? ctx.checker.getSymbolAtLocation(propsParameter.name)
    : undefined;
  if (!props || !fn.body || !isBlock(fn.body)) {
    return defaults;
  }
  for (const statement of fn.body.statements) {
    if (!isVariableStatement(statement)) {
      continue;
    }
    for (const variable of statement.declarationList.declarations) {
      if (
        isObjectBindingPattern(variable.name) &&
        variable.initializer &&
        readsProps(ctx, variable.initializer, props)
      ) {
        collectBindingDefaults(ctx, variable.name, defaults);
      }
    }
  }
  return defaults;
}

function collectObjectDefaults(
  ctx: Context,
  object: ObjectLiteralExpression,
  defaults: Map<string, string>
) {
  for (const property of object.properties) {
    if (isPropertyAssignment(property)) {
      defaults.set(property.name.getText(), resolveLiteral(ctx, property.initializer));
    } else if (isShorthandPropertyAssignment(property)) {
      const name = property.name.getText();
      const symbol = ctx.checker.getShorthandAssignmentValueSymbol(property);
      defaults.set(name, resolveSymbolLiteral(ctx, symbol, name));
    }
  }
}

/** Follows `defaultProps = myDefaults` to the object literal. */
function toObjectLiteral(ctx: Context, node: Expression | undefined) {
  if (node && isIdentifier(node)) {
    const symbol = ctx.checker.getSymbolAtLocation(node);
    const declaration = symbol && getDeclaration(ctx, symbol);
    node = declaration && isVariableDeclaration(declaration) ? declaration.initializer : undefined;
  }
  return node && isObjectLiteralExpression(node) ? node : undefined;
}

/** Gets defaults from `static defaultProps = {...}` and `Component.defaultProps = {...}`. */
function getDefaultPropsDefaults(ctx: Context, component: TsSymbol): Map<string, string> {
  const defaults = new Map<string, string>();
  const sourceFile = getDeclaration(ctx, component)?.getSourceFile();
  if (!sourceFile) {
    return defaults;
  }
  const isComponent = (node: Node) => {
    const symbol = ctx.checker.getSymbolAtLocation(node);
    return !!symbol && sameSymbol(resolveAlias(ctx, symbol), component);
  };

  for (const statement of sourceFile.statements) {
    if (isClassDeclaration(statement) && statement.name && isComponent(statement.name)) {
      for (const member of statement.members) {
        if (isPropertyDeclaration(member) && member.name.getText() === 'defaultProps') {
          const object = toObjectLiteral(ctx, member.initializer);
          if (object) {
            collectObjectDefaults(ctx, object, defaults);
          }
        }
      }
    }
    if (
      isExpressionStatement(statement) &&
      isBinaryExpression(statement.expression) &&
      statement.expression.operatorToken.kind === SyntaxKind.EqualsToken &&
      isPropertyAccessExpression(statement.expression.left) &&
      statement.expression.left.name.text === 'defaultProps' &&
      isComponent(statement.expression.left.expression)
    ) {
      const object = toObjectLiteral(ctx, statement.expression.right);
      if (object) {
        collectObjectDefaults(ctx, object, defaults);
      }
    }
  }
  return defaults;
}

/** Follows `export const Button = ButtonImpl` to `ButtonImpl`, which has the function body. */
function findImplementation(ctx: Context, symbol: TsSymbol): TsSymbol {
  let current = symbol;
  for (let depth = 0; depth <= MAX_DEPTH; depth++) {
    const declaration = getDeclaration(ctx, current);
    if (
      !declaration ||
      !isVariableDeclaration(declaration) ||
      !declaration.initializer ||
      !isIdentifier(declaration.initializer)
    ) {
      break;
    }
    const next = ctx.checker.getSymbolAtLocation(declaration.initializer);
    if (!next) {
      break;
    }
    current = resolveAlias(ctx, next);
  }
  return current;
}

// ---------------------------------------------------------------------------
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
