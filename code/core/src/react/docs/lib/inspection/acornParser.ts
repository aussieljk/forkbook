import { Parser } from 'acorn';
import type * as acorn from 'acorn';
import jsx from 'acorn-jsx';
import * as acornWalk from 'acorn-walk';
import type estree from 'estree';

import type {
  InspectionArray,
  InspectionAst,
  InspectionClass,
  InspectionElement,
  InspectionFunction,
  InspectionIdentifier,
  InspectionInferedType,
  InspectionLiteral,
  InspectionObject,
  JSXElementNode,
} from './types';
import { InspectionType } from './types';

interface ParsingResult<T> {
  inferredType: T;
  ast: InspectionAst;
}

const ACORN_WALK_VISITORS: acornWalk.RecursiveVisitors<unknown> = {
  // `base` exists at runtime, but the acorn-walk 7 types do not declare it.
  ...(Reflect.get(acornWalk, 'base') as acornWalk.RecursiveVisitors<unknown>),
  JSXElement: () => {},
};

/**
 * acorn parsed every node, so each one is an acorn node with `start` and `end`. The ESTree types
 * do not show these fields, and acorn-walk wants acorn nodes.
 */
function toAcornNode(node: estree.Node): acorn.Node {
  return node as unknown as acorn.Node;
}

const acornParser = Parser.extend(jsx());

// Cannot use "estree.Identifier" type because this function also support "JSXIdentifier".
function extractIdentifierName(identifierNode: object | null | undefined): string | null {
  return identifierNode != null && 'name' in identifierNode
    ? (identifierNode.name as string)
    : null;
}

function filterAncestors(ancestors: acorn.Node[]): acorn.Node[] {
  return ancestors.filter((x) => x.type === 'ObjectExpression' || x.type === 'ArrayExpression');
}

function calculateNodeDepth(node: estree.Expression): number {
  const depths: number[] = [];

  acornWalk.ancestor(
    toAcornNode(node),
    {
      ObjectExpression(_, __, ancestors) {
        depths.push(filterAncestors(ancestors).length);
      },
      ArrayExpression(_, __, ancestors) {
        depths.push(filterAncestors(ancestors).length);
      },
    },
    ACORN_WALK_VISITORS
  );

  return Math.max(...depths);
}

function parseIdentifier(identifierNode: estree.Identifier): ParsingResult<InspectionIdentifier> {
  return {
    inferredType: {
      type: InspectionType.IDENTIFIER,
      identifier: identifierNode.name,
    },
    ast: identifierNode,
  };
}

function parseLiteral(literalNode: estree.Literal): ParsingResult<InspectionLiteral> {
  return {
    inferredType: { type: InspectionType.LITERAL },
    ast: literalNode,
  };
}

function parseFunction(
  funcNode: estree.FunctionExpression | estree.ArrowFunctionExpression
): ParsingResult<InspectionFunction | InspectionElement> {
  let innerJsxElementNode: acorn.Node | undefined;

  // If there is at least a JSXElement in the body of the function, then it's a React component.
  acornWalk.simple(
    toAcornNode(funcNode.body),
    {
      JSXElement(node) {
        innerJsxElementNode = node;
      },
    },
    ACORN_WALK_VISITORS
  );

  const isJsx = innerJsxElementNode != null;

  const inferredType: InspectionFunction | InspectionElement = {
    type: isJsx ? InspectionType.ELEMENT : InspectionType.FUNCTION,
    params: funcNode.params,
    hasParams: funcNode.params.length !== 0,
  };

  const identifierName = extractIdentifierName((funcNode as estree.FunctionExpression).id);
  if (identifierName != null) {
    inferredType.identifier = identifierName;
  }

  return {
    inferredType,
    ast: funcNode,
  };
}

function parseClass(
  classNode: estree.ClassExpression
): ParsingResult<InspectionClass | InspectionElement> {
  let innerJsxElementNode: acorn.Node | undefined;

  // If there is at least a JSXElement in the body of the class, then it's a React component.
  acornWalk.simple(
    toAcornNode(classNode.body),
    {
      JSXElement(node) {
        innerJsxElementNode = node;
      },
    },
    ACORN_WALK_VISITORS
  );

  const inferredType: InspectionClass | InspectionElement = {
    type: innerJsxElementNode != null ? InspectionType.ELEMENT : InspectionType.CLASS,
    // An anonymous class gives null. Callers check the identifier for null before they use it.
    identifier: extractIdentifierName(classNode.id) as string,
  };

  return {
    inferredType,
    ast: classNode,
  };
}

function parseJsxElement(jsxElementNode: JSXElementNode): ParsingResult<InspectionElement> {
  const inferredType: InspectionElement = {
    type: InspectionType.ELEMENT,
  };

  const identifierName = extractIdentifierName(jsxElementNode.openingElement.name);
  if (identifierName != null) {
    inferredType.identifier = identifierName;
  }

  return {
    inferredType,
    ast: jsxElementNode,
  };
}

function parseCall(callNode: estree.CallExpression): ParsingResult<InspectionObject> | null {
  const identifierNode =
    callNode.callee.type === 'MemberExpression' ? callNode.callee.property : callNode.callee;

  const identifierName = extractIdentifierName(identifierNode);
  if (identifierName === 'shape') {
    return parseObject(callNode.arguments[0] as estree.ObjectExpression);
  }

  return null;
}

function parseObject(objectNode: estree.ObjectExpression): ParsingResult<InspectionObject> {
  return {
    inferredType: { type: InspectionType.OBJECT, depth: calculateNodeDepth(objectNode) },
    ast: objectNode,
  };
}

function parseArray(arrayNode: estree.ArrayExpression): ParsingResult<InspectionArray> {
  return {
    inferredType: { type: InspectionType.ARRAY, depth: calculateNodeDepth(arrayNode) },
    ast: arrayNode,
  };
}

// "estree.Expression" does not include JSX, so the JSX element type is added.
function parseExpression(
  expression: estree.Expression | JSXElementNode
): ParsingResult<InspectionInferedType> | null {
  switch (expression.type) {
    case 'Identifier':
      return parseIdentifier(expression);
    case 'Literal':
      return parseLiteral(expression);
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return parseFunction(expression);
    case 'ClassExpression':
      return parseClass(expression);
    case 'JSXElement':
      return parseJsxElement(expression);
    case 'CallExpression':
      return parseCall(expression);
    case 'ObjectExpression':
      return parseObject(expression);
    case 'ArrayExpression':
      return parseArray(expression);
    default:
      return null;
  }
}

export function parse(value: string): ParsingResult<InspectionInferedType> {
  const ast = acornParser.parse(`(${value})`, { ecmaVersion: 2020 }) as unknown as estree.Program;

  let parsingResult: ParsingResult<InspectionInferedType> = {
    inferredType: { type: InspectionType.UNKNOWN },
    ast,
  };

  if (ast.body[0] != null) {
    const rootNode = ast.body[0];

    switch (rootNode.type) {
      case 'ExpressionStatement': {
        const expressionResult = parseExpression(rootNode.expression);
        if (expressionResult != null) {
          parsingResult = expressionResult;
        }
        break;
      }
      default:
        break;
    }
  }

  return parsingResult;
}
