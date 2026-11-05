import { parser, types as t } from '@aussieljk/forkbook/internal/babel';

export function valueToAST(literal: unknown): t.Expression {
  if (literal === null) {
    return t.nullLiteral();
  }
  switch (typeof literal) {
    case 'function':
      const ast = parser.parse(literal.toString(), {
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
      });

      // The source of a function value parses as one expression statement.
      return (ast.program.body[0] as t.ExpressionStatement).expression;

    case 'number':
      return t.numericLiteral(literal);
    case 'string':
      return t.stringLiteral(literal);
    case 'boolean':
      return t.booleanLiteral(literal);
    case 'undefined':
      return t.identifier('undefined');
    default:
      if (Array.isArray(literal)) {
        return t.arrayExpression(literal.map(valueToAST));
      }
      const record = literal as Record<string, unknown>;
      return t.objectExpression(
        Object.keys(record)
          .filter((k) => {
            const value = record[k];
            return typeof value !== 'undefined';
          })
          .map((k) => {
            const value = record[k];
            return t.objectProperty(t.stringLiteral(k), valueToAST(value));
          })
      );
  }
}
