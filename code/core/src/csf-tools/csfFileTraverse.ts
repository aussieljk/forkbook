import { types as t, traverse } from '@aussieljk/forkbook/internal/babel';
import { storyNameFromExport } from '@aussieljk/forkbook/internal/csf/csf-utils';
import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { dedent } from 'ts-dedent';

import type { CsfFile } from './CsfFile.ts';
import { BadMetaError, MixedFactoryError, NoMetaError, formatLocation } from './csfFileErrors.ts';
import {
  getMetaObject,
  isArgsStory,
  isValidPreviewPath,
  parseExportsOrder,
  parseTestTags,
} from './csfFileParsers.ts';
import { findVarInitialization } from './findVarInitialization.ts';
import { isCsfFactoryCall, unwrapExpression } from './story-shape/utils.ts';

/** Walk a story file once and record its meta, stories, annotations, tests and imports on `csf`. */
export const traverseCsf = (csf: CsfFile) => {
  traverse(csf._ast, {
    ExportDefaultDeclaration: {
      enter(path) {
        const { node, parent } = path;
        const isVariableReference = t.isIdentifier(node.declaration) && t.isProgram(parent);

        /**
         * Transform inline default exports into a constant declaration as it is needed for the
         * Vitest plugin to compose stories using CSF1 through CSF3 should not be needed at all
         * once we move to CSF4 entirely
         *
         * `export default {};`
         *
         * Becomes
         *
         * `const _meta = {}; export default _meta;`
         */
        if (
          csf._options.transformInlineMeta &&
          !isVariableReference &&
          t.isExpression(node.declaration)
        ) {
          const metaId = path.scope.generateUidIdentifier('meta');
          csf._metaVariableName = metaId.name;
          const nodes = [
            t.variableDeclaration('const', [t.variableDeclarator(metaId, node.declaration)]),
            t.exportDefaultDeclaration(metaId),
          ];

          // Preserve sourcemaps location
          nodes.forEach((_node: t.Node) => (_node.loc = path.node.loc));
          path.replaceWithMultiple(nodes);

          // This is a bit brittle because it assumes that we will hit the inserted default export
          // as the traversal continues.
          return;
        }

        let decl;
        if (isVariableReference) {
          // const meta = { ... };
          // export default meta;
          const variableName = (node.declaration as t.Identifier).name;
          csf._metaVariableName = variableName;
          const isMetaVariable = (declaration: t.VariableDeclarator) =>
            t.isIdentifier(declaration.id) && declaration.id.name === variableName;

          csf._metaStatementPath = csf._file.path
            .get('body')
            .find(
              (path) => path.isVariableDeclaration() && path.node.declarations.some(isMetaVariable)
            );

          csf._metaStatement = csf._metaStatementPath?.node;

          decl = ((csf._metaStatement as t.VariableDeclaration)?.declarations || []).find(
            isMetaVariable
          )?.init;
        } else {
          csf._metaStatement = node;
          csf._metaStatementPath = path;
          decl = node.declaration;
        }

        const metaNode = getMetaObject(decl);
        if (metaNode && t.isProgram(parent)) {
          csf._parseMeta(metaNode, parent);
        }

        if (csf._metaStatement && !csf._metaNode) {
          throw new NoMetaError(
            'default export must be an object',
            csf._metaStatement,
            csf._options.fileName
          );
        }

        csf._metaPath = path;
      },
    },
    ExportNamedDeclaration: {
      enter(path) {
        const { node, parent } = path;
        const declaration = path.get('declaration');
        let declarations;
        if (declaration.isVariableDeclaration()) {
          declarations = declaration.get('declarations').filter((d) => d.isVariableDeclarator());
        } else if (declaration.isFunctionDeclaration()) {
          declarations = [declaration];
        }
        if (declarations) {
          // export const X = ...;
          declarations.forEach((declPath) => {
            const decl = declPath.node;
            const id = declPath.node.id;

            if (t.isIdentifier(id)) {
              const { name: exportName } = id;
              if (exportName === '__namedExportsOrder' && declPath.isVariableDeclarator()) {
                csf._namedExportsOrder = parseExportsOrder(declPath.node.init as t.Expression);
                return;
              }

              // Determine the story node, unwrapping TS expressions
              let storyNode;
              if (t.isVariableDeclarator(decl)) {
                if (
                  t.isTSAsExpression(decl.init) &&
                  t.isTSSatisfiesExpression(decl.init.expression)
                ) {
                  // { ... } satisfies Meta<...> as Meta<...>
                  storyNode = decl.init.expression.expression;
                } else if (t.isTSAsExpression(decl.init) || t.isTSSatisfiesExpression(decl.init)) {
                  // { ... } as Meta<...>
                  // { ... } satisfies Meta<...>
                  storyNode = decl.init.expression;
                } else {
                  storyNode = decl.init;
                }
              } else {
                storyNode = decl;
              }

              // Check if this is a factory story (meta.story() or meta.extend())
              let storyIsFactory = false;
              if (storyNode && isCsfFactoryCall(storyNode)) {
                storyIsFactory = true;
                storyNode = storyNode.arguments[0];
              }

              // Skip non-factory exports in factory files
              if (csf._metaIsFactory && !storyIsFactory) {
                return;
              }

              if (!csf._metaIsFactory && storyIsFactory) {
                if (csf._metaNode) {
                  throw new MixedFactoryError(
                    'expected non-factory story',
                    storyNode as t.Node,
                    csf._options.fileName
                  );
                } else {
                  throw new BadMetaError(
                    'meta() factory must be imported from .forkbook/preview configuration',
                    storyNode as t.Node,
                    csf._options.fileName
                  );
                }
              }

              // Now we know this is a valid story, register it
              csf._storyExports[exportName] = decl;
              csf._storyDeclarationPath[exportName] = declPath;
              csf._storyPaths[exportName] = path;
              csf._storyStatements[exportName] = node;
              let name = storyNameFromExport(exportName);
              if (csf._storyAnnotations[exportName]) {
                logger.warn(`Unexpected annotations for "${exportName}" before story declaration`);
              } else {
                csf._storyAnnotations[exportName] = {};
              }

              const parameters: { [key: string]: any } = {};
              if (t.isObjectExpression(storyNode)) {
                parameters.__isArgsStory = true; // assume default render is an args story
                // CSF3 object export
                (storyNode.properties as t.ObjectProperty[]).forEach((p) => {
                  if (t.isIdentifier(p.key)) {
                    const key = p.key.name;
                    if (t.isObjectMethod(p)) {
                      csf._storyAnnotations[exportName][key] = p;
                    } else {
                      if (p.key.name === 'render') {
                        parameters.__isArgsStory = isArgsStory(
                          p.value as t.Expression,
                          parent,
                          csf._templates
                        );
                      } else if (p.key.name === 'name' && t.isStringLiteral(p.value)) {
                        name = p.value.value;
                      } else if (p.key.name === 'storyName' && t.isStringLiteral(p.value)) {
                        logger.warn(
                          `Unexpected usage of "storyName" in "${exportName}". Please use "name" instead.`
                        );
                      } else if (p.key.name === 'parameters' && t.isObjectExpression(p.value)) {
                        const idProperty = p.value.properties.find(
                          (property) =>
                            t.isObjectProperty(property) &&
                            t.isIdentifier(property.key) &&
                            property.key.name === '__id'
                        ) as t.ObjectProperty | undefined;
                        if (idProperty) {
                          parameters.__id = (idProperty.value as t.StringLiteral).value;
                        }
                      }
                      csf._storyAnnotations[exportName][p.key.name] = p.value;
                    }
                  }
                });
              } else {
                parameters.__isArgsStory = isArgsStory(storyNode as t.Node, parent, csf._templates);
              }
              csf._stories[exportName] = {
                id: 'FIXME',
                name,
                parameters,
                __stats: {
                  factory: storyIsFactory,
                },
              };
            }
          });
        } else if (node.specifiers.length > 0) {
          // export { X as Y }
          node.specifiers.forEach((specifier) => {
            if (
              t.isExportSpecifier(specifier) &&
              (t.isIdentifier(specifier.exported) || t.isStringLiteral(specifier.exported))
            ) {
              const exportName = t.isIdentifier(specifier.exported)
                ? specifier.exported.name
                : specifier.exported.value;
              const { name: localName } = specifier.local;
              const decl = t.isProgram(parent)
                ? findVarInitialization(localName, parent)
                : specifier.local;

              if (exportName === 'default') {
                csf._metaVariableName = localName;

                const metaNode = getMetaObject(decl);
                if (metaNode && t.isProgram(parent)) {
                  csf._parseMeta(metaNode, parent);
                }
              } else {
                const annotations = {} as Record<string, t.Node>;
                const storyNode = decl;
                if (t.isObjectExpression(storyNode)) {
                  (storyNode.properties as t.ObjectProperty[]).forEach((p) => {
                    if (t.isIdentifier(p.key)) {
                      annotations[p.key.name] = p.value;
                    }
                  });
                }
                csf._storyAnnotations[exportName] = annotations;
                csf._storyStatements[exportName] = decl;
                csf._storyPaths[exportName] = path;
                csf._stories[exportName] = {
                  id: 'FIXME',
                  name: exportName,
                  localName,
                  parameters: {},
                  __stats: {},
                };
              }
            }
          });
        }
      },
    },
    ExpressionStatement: {
      enter({ node, parent }) {
        const { expression } = node;
        // B.storyName = 'some string';
        if (
          t.isProgram(parent) &&
          t.isAssignmentExpression(expression) &&
          t.isMemberExpression(expression.left) &&
          t.isIdentifier(expression.left.object) &&
          t.isIdentifier(expression.left.property)
        ) {
          const exportName = expression.left.object.name;
          const annotationKey = expression.left.property.name;
          const annotationValue = expression.right;

          if (csf._storyAnnotations[exportName]) {
            csf._storyAnnotations[exportName][annotationKey] = annotationValue;
          }

          if (annotationKey === 'storyName' && t.isStringLiteral(annotationValue)) {
            const storyName = annotationValue.value;
            const story = csf._stories[exportName];

            if (!story) {
              return;
            }
            story.name = storyName;
          }
        }
        // B.test('foo', () => {})
        // B.test('foo', context, () => {})
        if (
          t.isCallExpression(expression) &&
          t.isMemberExpression(expression.callee) &&
          t.isIdentifier(expression.callee.object) &&
          t.isIdentifier(expression.callee.property) &&
          expression.callee.property.name === 'test' &&
          expression.arguments.length >= 2 &&
          t.isStringLiteral(expression.arguments[0])
        ) {
          const exportName = expression.callee.object.name;
          const testName = expression.arguments[0].value;
          const testFunction =
            expression.arguments.length === 2 ? expression.arguments[1] : expression.arguments[2];
          const testArguments = expression.arguments.length === 2 ? null : expression.arguments[1];
          const tags = parseTestTags(testArguments as t.Node | null, csf._ast.program);

          csf._tests.push({
            function: testFunction,
            name: testName,
            node: expression,
            // can't set id because meta title isn't available yet
            // so it's set later on
            id: 'FIXME',
            tags,
            parent: { node: csf._storyStatements[exportName] },
          });

          // TODO: fix this when stories fail
          csf._stories[exportName].__stats.tests = true;
        }
      },
    },
    CallExpression: {
      enter(path) {
        const { node } = path;
        const { callee } = node;
        if (t.isIdentifier(callee) && callee.name === 'storiesOf') {
          throw new Error(dedent`
            Unexpected \`storiesOf\` usage: ${formatLocation(node, csf._options.fileName)}.

            \`storiesOf\` was removed in Forkbook 8.0. Write stories in CSF instead.
          `);
        }
        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.property) &&
          callee.property.name === 'meta' &&
          !callee.computed
        ) {
          // Find the root object for factory pattern:
          // - preview.meta() => preview
          // - preview.type().meta() => preview
          let rootObject = callee.object;
          if (t.isCallExpression(rootObject) && t.isMemberExpression(rootObject.callee)) {
            rootObject = rootObject.callee.object;
          }

          if (t.isIdentifier(rootObject)) {
            const configCandidate = path.scope.getBinding(rootObject.name);
            const configParent = configCandidate?.path?.parentPath?.node;
            if (t.isImportDeclaration(configParent)) {
              if (isValidPreviewPath(configParent.source.value)) {
                csf._metaIsFactory = true;
                csf._metaFactoryCall = node;
                const metaDeclarator = path.findParent((p) => p.isVariableDeclarator());

                // find the name of the meta variable declaration
                // e.g. const foo = preview.meta({ ... });
                // otherwise fallback to meta
                csf._metaVariableName =
                  metaDeclarator?.isVariableDeclarator() && t.isIdentifier(metaDeclarator.node.id)
                    ? metaDeclarator.node.id.name
                    : callee.property.name;
                const [argument] = node.arguments;
                const argumentBinding =
                  argument && t.isIdentifier(argument)
                    ? path.scope.getBinding(argument.name)
                    : undefined;
                const argumentNode =
                  argumentBinding?.constant && argumentBinding.path.isVariableDeclarator()
                    ? argumentBinding.path.node.init
                    : argument;
                const unwrappedArgument = argumentNode && unwrapExpression(argumentNode);
                if (t.isObjectExpression(unwrappedArgument)) {
                  csf._parseMeta(unwrappedArgument, csf._ast.program);
                } else {
                  csf._metaNodeIsSynthetic = true;
                  csf._parseMeta(t.objectExpression([]), csf._ast.program);
                }
              } else if (rootObject.name === 'preview') {
                // Only throw if the variable is named "preview" - this indicates
                // the user is trying to use CSF Factories but with a wrong import path.
                // Other .meta() calls (e.g., Zod v4's .meta()) are silently ignored.
                throw new BadMetaError(
                  'meta() factory must be imported from .forkbook/preview configuration',
                  configParent,
                  csf._options.fileName
                );
              }
            }
          }
        }
      },
    },
    ImportDeclaration: {
      enter({ node }) {
        const { source } = node;
        if (t.isStringLiteral(source)) {
          csf.imports.push(source.value);
        } else {
          throw new Error('CSF: unexpected import source');
        }
      },
    },
  });
};
