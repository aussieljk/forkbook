/** Context, symbol and node helpers shared by the component docgen extractor. */
import {
  type Expression,
  type Node,
  SyntaxKind,
  isArrowFunction,
  isAsExpression,
  isBinaryExpression,
  isFunctionExpression,
  isIdentifier,
  isNonNullExpression,
  isParenthesizedExpression,
  isPropertyAssignment,
  isPropertyDeclaration,
  isSatisfiesExpression,
  isShorthandPropertyAssignment,
  isVariableDeclaration,
} from 'typescript-native/unstable/ast';
import {
  type Checker,
  type NodeHandle,
  type Project,
  SymbolFlags,
  type Symbol as TsSymbol,
  type Type,
} from 'typescript-native/unstable/sync';

/**
 * Props from one `.d.ts` or `node_modules` file (or one interface there) above this count are not
 * documented. This removes the HTML attribute interfaces (more than 100 props) and generated CSS
 * prop types, and keeps the props that the user wrote.
 */
export const LARGE_SOURCE_THRESHOLD = 30;

/** Max depth when the extractor follows wrappers (memo, forwardRef, Object.assign) and aliases. */
export const MAX_DEPTH = 5;

export interface Context {
  project: Project;
  checker: Checker;
}

/** The props type of a component and the symbol that declares the component. */
export interface ResolvedComponent {
  /** `undefined` when the component takes no props. */
  propsType: Type | undefined;
  symbol: TsSymbol;
}

export function resolveAlias(ctx: Context, symbol: TsSymbol): TsSymbol {
  if (!(symbol.flags & SymbolFlags.Alias)) {
    return symbol;
  }
  const target = ctx.checker.getAliasedSymbol(symbol);
  return ctx.checker.isUnknownSymbol(target) ? symbol : target;
}

export function resolveHandle(ctx: Context, handle: NodeHandle | undefined): Node | undefined {
  return handle?.resolve(ctx.project);
}

export function getDeclaration(ctx: Context, symbol: TsSymbol): Node | undefined {
  return resolveHandle(ctx, symbol.valueDeclaration ?? symbol.declarations[0]);
}

export function getDeclarations(ctx: Context, symbol: TsSymbol): Node[] {
  return symbol.declarations.flatMap((handle) => resolveHandle(ctx, handle) ?? []);
}

export function sameSymbol(a: TsSymbol | undefined, b: TsSymbol | undefined) {
  return !!a && !!b && a.id === b.id;
}

export function getExport(ctx: Context, module: TsSymbol, name: string) {
  return ctx.checker.getExportsOfModule(module).find((symbol) => symbol.name === name);
}

export function getProperty(ctx: Context, type: Type, name: string) {
  return ctx.checker.getPropertyOfType(type, name);
}

/** Removes parentheses, `as`, `satisfies` and `!` around an expression. */
export function skipWrappers(node: Expression): Expression {
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
export function resolveComponentSymbol(ctx: Context, symbol: TsSymbol, depth = 0): TsSymbol {
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
