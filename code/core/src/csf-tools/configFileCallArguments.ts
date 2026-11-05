import { types as t, traverse } from '@aussieljk/forkbook/internal/babel';

import { type CsfMutationDiagnostic, type CsfObject, createCsfObject } from './CsfObject.ts';
import { unwrapExpression } from './story-shape/utils.ts';

export interface CallArgumentsOptions {
  importedName: string;
  methodName: string;
  moduleNames: Iterable<string>;
}

/** Find the object arguments of `importedName.methodName({...})` calls. See `ConfigFile.callArguments`. */
export const findCallArguments = (
  ast: t.File,
  { importedName, methodName, moduleNames }: CallArgumentsOptions,
  report: (diagnostic: CsfMutationDiagnostic) => void,
  markChanged: () => void
): CsfObject[] => {
  const modules = new Set(moduleNames);
  const imports = new Map<string, Set<t.Node>>();

  traverse(ast, {
    ImportDeclaration(path) {
      if (!modules.has(path.node.source.value) || path.node.importKind === 'type') {
        return;
      }

      for (const specifier of path.node.specifiers) {
        if (
          t.isImportSpecifier(specifier) &&
          specifier.importKind !== 'type' &&
          t.isIdentifier(specifier.imported, { name: importedName })
        ) {
          const bindingNodes = imports.get(specifier.local.name) ?? new Set<t.Node>();
          bindingNodes.add(specifier);
          imports.set(specifier.local.name, bindingNodes);
        }
      }
    },
    VariableDeclarator(path) {
      const { id, init } = path.node;
      if (
        !t.isObjectPattern(id) ||
        !t.isCallExpression(init) ||
        !t.isIdentifier(init.callee, { name: 'require' }) ||
        path.scope.getBinding('require') !== undefined ||
        init.arguments.length !== 1 ||
        !t.isStringLiteral(init.arguments[0]) ||
        !modules.has(init.arguments[0].value)
      ) {
        return;
      }

      for (const property of id.properties) {
        if (
          t.isObjectProperty(property) &&
          !property.computed &&
          ((t.isIdentifier(property.key) && property.key.name === importedName) ||
            (t.isStringLiteral(property.key) && property.key.value === importedName)) &&
          t.isIdentifier(property.value)
        ) {
          const bindingNodes = imports.get(property.value.name) ?? new Set<t.Node>();
          bindingNodes.add(path.node);
          imports.set(property.value.name, bindingNodes);
        }
      }
    },
  });

  const objects: CsfObject[] = [];

  traverse(ast, {
    CallExpression(path) {
      const { callee } = path.node;
      if (
        !t.isMemberExpression(callee) ||
        !t.isIdentifier(callee.object) ||
        !(
          (t.isIdentifier(callee.property) &&
            !callee.computed &&
            callee.property.name === methodName) ||
          (t.isStringLiteral(callee.property) && callee.property.value === methodName)
        )
      ) {
        return;
      }

      const bindingNode = path.scope.getBinding(callee.object.name)?.path.node;
      if (bindingNode && imports.get(callee.object.name)?.has(bindingNode)) {
        const argument = path.node.arguments[0];
        if (!argument) {
          return;
        }
        const value = unwrapExpression(argument);
        const target = { kind: 'call-argument', importedName, methodName } as const;
        const binding = path.scope.getBinding(callee.object.name);
        if (!binding?.constant || !t.isObjectExpression(value)) {
          report({
            code: !binding?.constant ? 'ambiguous-binding' : 'unsupported-initializer',
            target,
            path: [],
            message: !binding?.constant
              ? 'the imported binding is reassigned'
              : 'the call argument is not an object literal',
            ...(argument.loc ? { loc: argument.loc } : {}),
          });
          return;
        }
        objects.push(
          createCsfObject(
            target,
            {
              node: value,
              scope: path.scope,
              buildCodeFrameError: path.buildCodeFrameError.bind(path),
            },
            [],
            report,
            markChanged
          )
        );
      }
    },
  });

  return objects;
};
