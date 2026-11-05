import { types as t } from '@aussieljk/forkbook/internal/babel';

import type { Tag } from '../shared/constants/tags.ts';
import { findVarInitialization } from './findVarInitialization.ts';
import { isCanonicalCsf2BindCall } from './story-shape/utils.ts';

const PREVIEW_FILE_REGEX = /\/preview(.(js|jsx|mjs|ts|tsx))?$/;
export const isValidPreviewPath = (filepath: string) => PREVIEW_FILE_REGEX.test(filepath);

const MODULE_MOCK_REGEX = /^[.\/#].*\.mock($|\.[^.]*$)/i;
export const isModuleMock = (importPath: string) => MODULE_MOCK_REGEX.test(importPath);

export function parseIncludeExclude(prop: t.Node) {
  if (t.isArrayExpression(prop)) {
    return prop.elements.map((e) => {
      if (t.isStringLiteral(e)) {
        return e.value;
      }
      throw new Error(`Expected string literal: ${e}`);
    });
  }

  if (t.isStringLiteral(prop)) {
    return new RegExp(prop.value);
  }

  if (t.isRegExpLiteral(prop)) {
    return new RegExp(prop.pattern, prop.flags);
  }

  throw new Error(`Unknown include/exclude: ${prop}`);
}

export function parseTags(prop: t.Node | null | undefined) {
  if (!t.isArrayExpression(prop)) {
    throw new Error('CSF: Expected tags array');
  }

  return prop.elements.map((e) => {
    if (t.isStringLiteral(e)) {
      return e.value;
    }
    throw new Error(`CSF: Expected tag to be string literal`);
  }) as Tag[];
}

/** Read `tags` from the options of `Story.test(name, options, fn)`. */
export function parseTestTags(optionsNode: t.Node | null | undefined, program: t.Program) {
  const node = t.isIdentifier(optionsNode)
    ? findVarInitialization(optionsNode.name, program)
    : optionsNode;

  if (t.isObjectExpression(node)) {
    const tagsProp = node.properties.find(
      (property): property is t.ObjectProperty =>
        t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'tags' })
    );

    if (tagsProp) {
      const tagsNode = t.isIdentifier(tagsProp.value)
        ? findVarInitialization(tagsProp.value.name, program)
        : tagsProp.value;
      return parseTags(tagsNode);
    }
  }

  return [] as string[];
}

/**
 * Report whether a story function takes args. For `Template.bind({})`, it records the template in
 * `templates` and checks the template.
 */
export const isArgsStory = (
  init: t.Node,
  parent: t.Node,
  templates: Record<string, t.Expression>
) => {
  let storyFn: t.Node = init;
  // export const Foo = Bar.bind({})
  if (t.isProgram(parent) && isCanonicalCsf2BindCall(init)) {
    const boundIdentifier = init.callee.object.name;
    const template = findVarInitialization(boundIdentifier, parent);
    if (template) {
      templates[boundIdentifier] = template;
      storyFn = template;
    }
  }
  if (t.isArrowFunctionExpression(storyFn) || t.isFunctionDeclaration(storyFn)) {
    return storyFn.params.length > 0;
  }
  return false;
};

export const parseExportsOrder = (init: t.Expression | null | undefined) => {
  if (t.isArrayExpression(init)) {
    return init.elements.map((item) => {
      if (t.isStringLiteral(item)) {
        return item.value;
      }
      throw new Error(`Expected string literal named export: ${item}`);
    });
  }
  throw new Error(`Expected array of string literals: ${init}`);
};

/** Keep only the named entries, in the given order. */
export const sortExports = <T>(exportByName: Record<string, T>, order: string[]) => {
  const sorted: Record<string, T> = {};
  for (const name of order) {
    if (exportByName[name]) {
      sorted[name] = exportByName[name];
    }
  }
  return sorted;
};

/** Report whether a play function destructures `mount` from its first argument. */
export const hasMount = (play: t.Node | undefined) => {
  if (
    t.isArrowFunctionExpression(play) ||
    t.isFunctionDeclaration(play) ||
    t.isObjectMethod(play)
  ) {
    const [arg] = play.params;
    if (t.isObjectPattern(arg)) {
      return arg.properties.some(
        (prop) => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'mount' })
      );
    }
  }
  return false;
};

/**
 * Get the object literal of a meta declaration: `{...}`, `{...} as Meta`, `{...} satisfies Meta`,
 * or `{...} satisfies Meta as Meta`.
 */
export const getMetaObject = (decl: t.Node | null | undefined): t.ObjectExpression | undefined => {
  if (t.isObjectExpression(decl)) {
    return decl;
  }
  if (
    (t.isTSAsExpression(decl) || t.isTSSatisfiesExpression(decl)) &&
    t.isObjectExpression(decl.expression)
  ) {
    return decl.expression;
  }
  if (
    t.isTSAsExpression(decl) &&
    t.isTSSatisfiesExpression(decl.expression) &&
    t.isObjectExpression(decl.expression.expression)
  ) {
    return decl.expression.expression;
  }
  return undefined;
};

/** Reads `parameters.thumbnail` when it is a string literal in the object. */
export const staticThumbnail = (parameters: t.Node | undefined): string | undefined => {
  if (!t.isObjectExpression(parameters)) {
    return undefined;
  }
  const property = parameters.properties.find(
    (p): p is t.ObjectProperty =>
      t.isObjectProperty(p) &&
      ((t.isIdentifier(p.key) && p.key.name === 'thumbnail') ||
        (t.isStringLiteral(p.key) && p.key.value === 'thumbnail'))
  );
  const value = property?.value;
  if (t.isStringLiteral(value)) {
    return value.value;
  }
  if (t.isTemplateLiteral(value) && value.expressions.length === 0) {
    return value.quasis[0].value.cooked ?? undefined;
  }
  return undefined;
};
