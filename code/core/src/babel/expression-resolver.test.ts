import { describe, expect, it } from 'vitest';

import * as parser from '@babel/parser';
import type * as t from '@babel/types';

import { resolveExpression, unwrapTSExpression } from './expression-resolver.ts';

const parse = (code: string) =>
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
  });

/** The expression of the expression statement at `index`. */
const expressionAt = (ast: t.File, index = 0) =>
  (ast.program.body[index] as t.ExpressionStatement).expression;

/** The declaration of the `export default` statement at `index`. */
const defaultExportAt = (ast: t.File, index: number) =>
  (ast.program.body[index] as t.ExportDefaultDeclaration).declaration as t.Expression;

const nameOf = (node: t.Node | null) => (node as t.Identifier).name;

describe('unwrapTSExpression', () => {
  it('returns non-TS-wrapped expressions unchanged', () => {
    const ast = parse('42');
    const numLiteral = expressionAt(ast);
    expect(unwrapTSExpression(numLiteral)).toBe(numLiteral);
  });

  it('unwraps TSAsExpression', () => {
    const ast = parse('foo as string');
    const asExpr = expressionAt(ast);
    const result = unwrapTSExpression(asExpr);
    expect(result.type).toBe('Identifier');
    expect(nameOf(result)).toBe('foo');
  });

  it('unwraps TSSatisfiesExpression', () => {
    const ast = parse('foo satisfies string');
    const satisfiesExpr = expressionAt(ast);
    const result = unwrapTSExpression(satisfiesExpr);
    expect(result.type).toBe('Identifier');
    expect(nameOf(result)).toBe('foo');
  });

  it('unwraps TSTypeAssertion (<string>foo)', () => {
    const ast = parser.parse('<string>foo', {
      sourceType: 'module',
      plugins: [['typescript', { dts: false }]],
    });
    const typeAssertion = expressionAt(ast);
    const result = unwrapTSExpression(typeAssertion);
    expect(result.type).toBe('Identifier');
    expect(nameOf(result)).toBe('foo');
  });

  it('unwraps nested TS wrappers', () => {
    const ast = parse('(foo as any) satisfies string');
    const outer = expressionAt(ast);
    const result = unwrapTSExpression(outer);
    expect(result.type).toBe('Identifier');
    expect(nameOf(result)).toBe('foo');
  });
});

describe('resolveExpression', () => {
  it('returns null for null/undefined input', () => {
    const ast = parse('');
    expect(resolveExpression(null, ast)).toBeNull();
    expect(resolveExpression(undefined, ast)).toBeNull();
  });

  it('returns non-Identifier expressions directly', () => {
    const ast = parse('42');
    const numLiteral = expressionAt(ast);
    expect(resolveExpression(numLiteral, ast)).toBe(numLiteral);
  });

  it('resolves a bare VariableDeclaration', () => {
    const ast = parse(`
      const foo = { a: 1 };
      export default foo;
    `);
    const result = resolveExpression(defaultExportAt(ast, 1), ast);
    expect(result?.type).toBe('ObjectExpression');
  });

  it('resolves an exported const (ExportNamedDeclaration)', () => {
    const ast = parse(`
      export const config = { a: 1 };
      export default config;
    `);
    const result = resolveExpression(defaultExportAt(ast, 1), ast);
    expect(result?.type).toBe('ObjectExpression');
  });

  it('resolves a chain of variable references', () => {
    const ast = parse(`
      const inner = { a: 1 };
      const outer = inner;
      export default outer;
    `);
    const result = resolveExpression(defaultExportAt(ast, 2), ast);
    expect(result?.type).toBe('ObjectExpression');
  });

  it('resolves through TSAsExpression', () => {
    const ast = parse(`
      const foo = { a: 1 };
      export default foo as any;
    `);
    const result = resolveExpression(defaultExportAt(ast, 1), ast);
    expect(result?.type).toBe('ObjectExpression');
  });

  it('resolves through TSSatisfiesExpression', () => {
    const ast = parse(`
      const foo = { a: 1 };
      export default foo satisfies object;
    `);
    const result = resolveExpression(defaultExportAt(ast, 1), ast);
    expect(result?.type).toBe('ObjectExpression');
  });

  it('returns the Identifier node when variable is not found', () => {
    const ast = parse(`export default unknown;`);
    const result = resolveExpression(defaultExportAt(ast, 0), ast);
    expect(result?.type).toBe('Identifier');
    expect(nameOf(result)).toBe('unknown');
  });

  it('returns the Identifier node when variable has no initializer', () => {
    const ast = parse(`
      let foo;
      export default foo;
    `);
    const result = resolveExpression(defaultExportAt(ast, 1), ast);
    expect(result?.type).toBe('Identifier');
    expect(nameOf(result)).toBe('foo');
  });

  it('returns null when maxDepth is exceeded', () => {
    // Create a chain longer than maxDepth (default 10)
    const lines = Array.from({ length: 12 }, (_, i) =>
      i === 0 ? `const v0 = { a: 1 };` : `const v${i} = v${i - 1};`
    ).join('\n');
    const ast = parse(`${lines}\nexport default v11;`);
    const result = resolveExpression(defaultExportAt(ast, ast.program.body.length - 1), ast);
    // Depth exceeded — returns null
    expect(result).toBeNull();
  });
});
