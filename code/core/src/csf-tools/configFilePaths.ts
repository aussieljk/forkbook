import { types as t } from '@aussieljk/forkbook/internal/babel';

/** Read object properties of a config export by key path. */
export const propKey = (p: t.ObjectProperty) => {
  if (t.isIdentifier(p.key)) {
    return p.key.name;
  }

  if (t.isStringLiteral(p.key)) {
    return p.key.value;
  }
  return null;
};

export const getPath = (path: string[], node: t.Node): t.Node | undefined => {
  if (path.length === 0) {
    return node;
  }
  if (t.isObjectExpression(node)) {
    const [first, ...rest] = path;
    const field = (node.properties as t.ObjectProperty[]).find((p) => propKey(p) === first);
    if (field) {
      return getPath(rest, (field as t.ObjectProperty).value);
    }
  }
  return undefined;
};

export const getPathProperties = (path: string[], node: t.Node): t.ObjectProperty[] | undefined => {
  if (path.length === 0) {
    if (t.isObjectExpression(node)) {
      return node.properties as t.ObjectProperty[];
    }
    throw new Error('Expected object expression');
  }
  if (t.isObjectExpression(node)) {
    const [first, ...rest] = path;
    const field = (node.properties as t.ObjectProperty[]).find((p) => propKey(p) === first);
    if (field) {
      // FIXME: handle spread etc.
      if (rest.length === 0) {
        return node.properties as t.ObjectProperty[];
      }

      return getPathProperties(rest, (field as t.ObjectProperty).value);
    }
  }
  return undefined;
};
