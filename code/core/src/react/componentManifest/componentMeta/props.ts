/** Read and serialize the props of a props type. */
import {
  type Node,
  isEnumDeclaration,
  isInterfaceDeclaration,
  isLiteralTypeNode,
  isNumericLiteral,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeReferenceNode,
  isUnionTypeNode,
} from 'typescript-native/unstable/ast';
import {
  SymbolFlags,
  type Symbol as TsSymbol,
  type Type,
  type LiteralType,
  TypeFlags,
  isUnionType,
} from 'typescript-native/unstable/sync';

import type { ParentType, PropItemType } from './componentMetaExtractor.ts';
import {
  type Context,
  LARGE_SOURCE_THRESHOLD,
  MAX_DEPTH,
  getDeclaration,
  getProperty,
  resolveAlias,
  resolveHandle,
} from './symbols.ts';

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
export function getPropSymbols(ctx: Context, propsType: Type, location: Node): PropSymbol[] {
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

export function getParent(ctx: Context, prop: TsSymbol): ParentType | undefined {
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
export function getBulkProps(ctx: Context, props: TsSymbol[]): Set<string> {
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
export function getSourceLiteralOrder(ctx: Context, prop: TsSymbol): string[] {
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

export function serializeType(
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
