/** Read prop default values from destructuring defaults and `defaultProps`. */
import {
  type ArrowFunction,
  type Expression,
  type FunctionDeclaration,
  type FunctionExpression,
  type Node,
  type ObjectBindingPattern,
  type ObjectLiteralExpression,
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
  isEnumMember,
  isExportAssignment,
  isExpressionStatement,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isNewExpression,
  isObjectBindingPattern,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isPropertyDeclaration,
  isSatisfiesExpression,
  isShorthandPropertyAssignment,
  isVariableDeclaration,
  isVariableStatement,
} from 'typescript-native/unstable/ast';
import { type Symbol as TsSymbol } from 'typescript-native/unstable/sync';

import {
  type Context,
  MAX_DEPTH,
  getDeclaration,
  getDeclarations,
  resolveAlias,
  sameSymbol,
  skipWrappers,
} from './symbols.ts';

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
export function getDestructuringDefaults(ctx: Context, component: TsSymbol): Map<string, string> {
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
export function getDefaultPropsDefaults(ctx: Context, component: TsSymbol): Map<string, string> {
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
export function findImplementation(ctx: Context, symbol: TsSymbol): TsSymbol {
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
