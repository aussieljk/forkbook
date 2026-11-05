import { readFile, writeFile } from 'node:fs/promises';

import {
  type RecastOptions,
  babelParse,
  generate,
  recast,
  types as t,
  traverse,
} from '@aussieljk/forkbook/internal/babel';
import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { dedent } from 'ts-dedent';
import invariant from 'tiny-invariant';

import type { PrintResultType } from './PrintResultType.ts';
import { createConfigObject } from './ConfigObject.ts';
import type { CsfMutationDiagnostic, CsfMutationResult, CsfObject, CsfValue } from './CsfObject.ts';
import { type CallArgumentsOptions, findCallArguments } from './configFileCallArguments.ts';
import {
  type ImportSpecifierInput,
  removeImport,
  setImport,
  setRequireImport,
} from './configFileImports.ts';
import { getPath, getPathProperties, propKey } from './configFilePaths.ts';
import { findVarDeclarator, findVarInitialization } from './findVarInitialization.ts';

export type { CallArgumentsOptions } from './configFileCallArguments.ts';
export { getHeaderComments } from './configFileImports.ts';

// Only logged: a mutation of such an export fails with a diagnostic of its own.
const getCsfParsingErrorMessage = ({
  fileName,
  expectedType,
  foundType,
  node,
}: {
  fileName: string | undefined;
  expectedType: string;
  foundType: string | undefined;
  node: t.Node | null | undefined;
}) => {
  return dedent`
      CSF Parsing error in ${fileName ?? 'a config file'}: Expected '${expectedType}' but found '${foundType}' instead in '${node?.type}'.
    `;
};

export class ConfigFile implements CsfObject {
  /**
   * Identify the config, meta, story, annotation, or call argument this editor represents.
   *
   * @example
   * ```ts
   * const object = loadConfig('export default {};').parse();
   * object.target; // { kind: 'config' }
   * ```
   */
  readonly target = { kind: 'config' } as const;
  // No member may be private: core resolves this class from both src and dist, and any private
  // member makes the emitted class type nominal, so the two identities stop being assignable.
  _changed = false;
  _mutationDiagnostics: CsfMutationDiagnostic[] = [];

  /**
   * Report whether this editor has applied a mutation. Reads and no-op edits leave it unchanged.
   *
   * @example
   * ```ts
   * const object = loadConfig('export default {};').parse();
   * object.changed; // false
   * object.set(['tags'], ['autodocs']);
   * object.changed; // true
   * ```
   */
  get changed() {
    return this._changed;
  }

  /**
   * Read diagnostics from unsupported discovery, reads, or mutations. `writeConfig` refuses to
   * write a config with diagnostics, even if another edit succeeded.
   *
   * @example
   * ```ts
   * const config = loadConfig('export default { old: 1, current: 2 };').parse();
   * config.rename(['old'], 'current');
   * config.mutationDiagnostics.map(({ code }) => code); // ['occupied-destination']
   * config.changed; // false
   * ```
   */
  get mutationDiagnostics(): readonly CsfMutationDiagnostic[] {
    return [...this._mutationDiagnostics];
  }

  /**
   * Read a copy of the Babel expression at a property path. Missing fields return `undefined`.
   *
   * @example
   * ```ts
   * const object = loadConfig("export default { tags: ['docs'] };").parse();
   * object.get(['tags'])?.type; // 'ArrayExpression'
   * object.get(['missing']); // undefined
   * ```
   */
  get(path: readonly string[]): t.Expression | undefined {
    const editor = this._editor('read');
    return editor.ok ? editor.object.get(path) : undefined;
  }

  /**
   * Read plain values without executing code. Missing fields return `undefined`; unresolved
   * expressions also return `undefined` and add a mutation diagnostic.
   *
   * @example
   * ```ts
   * const object = loadConfig("export default { tags: ['docs'], enabled: true };").parse();
   * object.getValue(['tags']); // ['docs']
   * object.getValue(['enabled']); // true
   * object.getValue(['missing']); // undefined
   * ```
   */
  getValue(path: readonly string[]): CsfValue {
    const editor = this._editor('read');
    return editor.ok ? editor.object.getValue(path) : undefined;
  }

  /**
   * Set a plain value or Babel expression, creating missing parents. Accepts nested arrays and
   * objects; top-level expression-shaped objects are interpreted as AST nodes.
   *
   * @example
   * ```ts
   * const object = loadConfig('export default {};').parse();
   * object.set(['parameters', 'a11y'], { test: 'todo', enabled: true });
   * // { ok: true, changed: true }
   * object.getValue(['parameters']); // { a11y: { test: 'todo', enabled: true } }
   * ```
   */
  set(path: readonly string[], value: CsfValue | t.Expression): CsfMutationResult {
    return this._mutate((object) => object.set(path, value));
  }

  /**
   * Replace a value using its live Babel expression. Reused nodes preserve their source formatting.
   * Return a new node, or `undefined` to leave the value unchanged. Do not mutate or retain the input
   * node: such changes bypass change tracking and diagnostics.
   *
   * @example
   * ```ts
   * const object = loadConfig("export default { tags: ['docs'] };").parse();
   * object.transform(['tags'], (value) =>
   *   t.arrayExpression([t.spreadElement(value), t.stringLiteral('autodocs')])
   * ); // { ok: true, changed: true }
   * object.getValue(['tags']); // ['docs', 'autodocs']
   * ```
   */
  transform(
    path: readonly string[],
    derive: (value: t.Expression) => t.Expression | undefined
  ): CsfMutationResult {
    return this._mutate((object) => object.transform(path, derive));
  }

  /**
   * Remove a property and recursively clean up empty parents. Missing fields are a no-op.
   *
   * @example
   * ```ts
   * const object = loadConfig('export default { parameters: { a11y: { disable: true } } };').parse();
   * object.remove(['parameters', 'a11y', 'disable']); // { ok: true, changed: true }
   * object.getValue(['parameters']); // undefined
   * object.remove(['parameters']); // { ok: true, changed: false }
   * ```
   */
  remove(path: readonly string[]): CsfMutationResult {
    return this._mutate((object) => object.remove(path));
  }

  /**
   * Rename a property within its parent. An occupied destination produces a diagnostic
   * and leaves the source unchanged.
   *
   * @example
   * ```ts
   * const object = loadConfig("export default { a11y: { element: '#root' } };").parse();
   * object.rename(['a11y', 'element'], 'context'); // { ok: true, changed: true }
   * object.getValue(['a11y']); // { context: '#root' }
   * ```
   */
  rename(path: readonly string[], name: string): CsfMutationResult {
    return this._mutate((object) => object.rename(path, name));
  }

  /**
   * Move a property to another path, creating missing destination parents and cleaning up
   * empty source parents. Rejects occupied destinations. Use `group` when nesting siblings must
   * preserve expression evaluation order.
   *
   * @example
   * ```ts
   * const object = loadConfig("export default { globals: { theme: 'dark' } };").parse();
   * object.move(['globals'], ['initialGlobals']); // { ok: true, changed: true }
   * object.getValue(['initialGlobals']); // { theme: 'dark' }
   * object.getValue(['globals']); // undefined
   * ```
   */
  move(from: readonly string[], to: readonly string[]): CsfMutationResult {
    return this._mutate((object) => object.move(from, to));
  }

  /**
   * Nest named sibling properties under a destination, retaining their source order. Rejects
   * conflicts and relocations that could change evaluation order. Missing source fields are ignored.
   *
   * @example
   * ```ts
   * const object = loadConfig('export default { showNav: false, showPanel: true };').parse();
   * object.group(['layout'], ['showNav', 'showPanel']); // { ok: true, changed: true }
   * object.getValue(['layout']); // { showNav: false, showPanel: true }
   * object.getValue(['showNav']); // undefined
   * ```
   */
  group(path: readonly string[], names: readonly string[]): CsfMutationResult {
    return this._mutate((object) => object.group(path, names));
  }

  _mutate(operation: (object: CsfObject) => CsfMutationResult): CsfMutationResult {
    const editor = this._editor('mutate');
    return editor.ok === true
      ? operation(editor.object)
      : { ok: false, changed: false, diagnostic: editor.diagnostic };
  }

  _editor(mode: 'read' | 'mutate') {
    const editor = createConfigObject(
      this,
      mode,
      (diagnostic) => this._mutationDiagnostics.push(diagnostic),
      () => {
        this._changed = true;
        this._exports = {};
        this._exportDecls = {};
        this.parse();
      }
    );
    if (editor.ok === false) {
      this._mutationDiagnostics.push(editor.diagnostic);
    }
    return editor;
  }

  _ast: t.File;

  _code: string;

  _exports: Record<string, t.Expression> = {};

  // FIXME: this is a hack. this is only used in the case where the user is
  // modifying a named export that's a scalar. The _exports map is not suitable
  // for that. But rather than refactor the whole thing, we just use this as a stopgap.
  _exportDecls: Record<string, t.VariableDeclarator | t.FunctionDeclaration> = {};

  _exportsObject: t.ObjectExpression | undefined;

  _quotes: 'single' | 'double' | undefined;

  fileName?: string;

  hasDefaultExport = false;

  constructor(ast: t.File, code: string, fileName?: string) {
    this._ast = ast;
    this._code = code;
    this.fileName = fileName;
  }

  _parseExportsObject(exportsObject: t.ObjectExpression) {
    this._exportsObject = exportsObject;
    (exportsObject.properties as t.ObjectProperty[]).forEach((p) => {
      const exportName = propKey(p);
      if (exportName) {
        const exportVal = this._resolveDeclaration(p.value as t.Node);
        this._exports[exportName] = exportVal as t.Expression;
      }
    });
  }

  /** Unwraps TS assertions/satisfies from a node, to get the underlying node. */
  _unwrap = (node: t.Node | undefined | null): any => {
    if (t.isTSAsExpression(node) || t.isTSSatisfiesExpression(node)) {
      return this._unwrap(node.expression);
    }
    return node;
  };

  /**
   * Resolve a declaration node by unwrapping TS assertions/satisfies and following identifiers to
   * resolve the correct node in case it's an identifier.
   */
  _resolveDeclaration = (node: t.Node, parent: t.Node = this._ast.program) => {
    const decl = this._unwrap(node);
    if (t.isIdentifier(decl) && t.isProgram(parent)) {
      const initialization = findVarInitialization(decl.name, parent);
      return initialization ? this._unwrap(initialization) : decl;
    }
    return decl;
  };

  parse() {
    // Infer the dominant quote style from the pristine AST up front: later mutations can
    // remove the last string literals (e.g. cleanupTypeImports dropping a legacy import),
    // which must not change how newly generated nodes are quoted.
    this._inferQuotes();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    traverse(this._ast, {
      ExportDefaultDeclaration: {
        enter({ node, parent }) {
          self.hasDefaultExport = true;
          let decl = self._resolveDeclaration(node.declaration as t.Node, parent);

          // csf factory - unwrap call expressions like definePreview({...}) or definePreview({...}).type<T>()
          while (t.isCallExpression(decl)) {
            if (t.isObjectExpression(decl.arguments[0])) {
              decl = decl.arguments[0];
              break;
            } else if (
              t.isMemberExpression(decl.callee) &&
              t.isCallExpression(decl.callee.object)
            ) {
              decl = decl.callee.object;
            } else {
              break;
            }
          }

          if (t.isObjectExpression(decl)) {
            self._parseExportsObject(decl);
          } else {
            logger.debug(
              getCsfParsingErrorMessage({
                fileName: self.fileName,
                expectedType: 'ObjectExpression',
                foundType: decl?.type,
                node: decl || node.declaration,
              })
            );
          }
        },
      },
      ExportNamedDeclaration: {
        enter({ node, parent }) {
          if (t.isVariableDeclaration(node.declaration)) {
            // export const X = ...;
            node.declaration.declarations.forEach((decl) => {
              if (t.isVariableDeclarator(decl) && t.isIdentifier(decl.id)) {
                const { name: exportName } = decl.id;
                const exportVal = self._resolveDeclaration(decl.init as t.Node, parent);
                self._exports[exportName] = exportVal;
                self._exportDecls[exportName] = decl;
              }
            });
          } else if (t.isFunctionDeclaration(node.declaration)) {
            // export function X() {...};
            const decl = node.declaration;
            if (t.isIdentifier(decl.id)) {
              const { name: exportName } = decl.id;
              self._exportDecls[exportName] = decl;
              self._exports[exportName] = t.toExpression(t.cloneNode(decl));
            }
          } else if (node.specifiers) {
            // export { X };
            node.specifiers.forEach((spec) => {
              if (
                t.isExportSpecifier(spec) &&
                t.isIdentifier(spec.local) &&
                (t.isIdentifier(spec.exported) || t.isStringLiteral(spec.exported))
              ) {
                const { name: localName } = spec.local;
                const exportName = t.isIdentifier(spec.exported)
                  ? spec.exported.name
                  : spec.exported.value;

                const decl =
                  findVarDeclarator(localName, self._ast.program) ??
                  self._ast.program.body.find(
                    (statement): statement is t.FunctionDeclaration =>
                      t.isFunctionDeclaration(statement) && statement.id?.name === localName
                  );
                // decl can be empty in case X from `import { X } from ....` because it is not handled in _findVarDeclarator
                if (decl) {
                  const value = t.isFunctionDeclaration(decl)
                    ? t.toExpression(t.cloneNode(decl))
                    : decl.init
                      ? self._resolveDeclaration(decl.init, parent)
                      : undefined;
                  if (exportName === 'default' && t.isObjectExpression(value)) {
                    self.hasDefaultExport = true;
                    self._parseExportsObject(value);
                    return;
                  }
                  self._exports[exportName] = value;
                  self._exportDecls[exportName] = decl;
                }
              }
            });
          } else {
            logger.debug(
              getCsfParsingErrorMessage({
                fileName: self.fileName,
                expectedType: 'VariableDeclaration',
                foundType: node.declaration?.type,
                node: node.declaration,
              })
            );
          }
        },
      },
      ExpressionStatement: {
        enter({ node, parent }) {
          if (t.isAssignmentExpression(node.expression) && node.expression.operator === '=') {
            const { left, right } = node.expression;
            if (
              t.isMemberExpression(left) &&
              t.isIdentifier(left.object) &&
              left.object.name === 'module' &&
              t.isIdentifier(left.property) &&
              left.property.name === 'exports'
            ) {
              let exportObject = right;
              exportObject = self._resolveDeclaration(exportObject as t.Node, parent);

              if (t.isObjectExpression(exportObject)) {
                self._exportsObject = exportObject;
                (exportObject.properties as t.ObjectProperty[]).forEach((p) => {
                  const exportName = propKey(p);
                  if (exportName) {
                    const exportVal = self._resolveDeclaration(p.value as t.Node, parent);
                    self._exports[exportName] = exportVal as t.Expression;
                  }
                });
              } else {
                logger.debug(
                  getCsfParsingErrorMessage({
                    fileName: self.fileName,
                    expectedType: 'ObjectExpression',
                    foundType: exportObject?.type,
                    node: exportObject,
                  })
                );
              }
            }
          }
        },
      },
      CallExpression: {
        enter: ({ node }) => {
          if (
            t.isIdentifier(node.callee) &&
            node.callee.name === 'definePreview' &&
            node.arguments.length === 1 &&
            t.isObjectExpression(node.arguments[0])
          ) {
            self._parseExportsObject(node.arguments[0]);
          }
        },
      },
    });
    return self;
  }

  getFieldNode(path: string[]) {
    const [root, ...rest] = path;
    const exported = this._exports[root];

    if (!exported) {
      return undefined;
    }
    return getPath(rest, exported);
  }

  getFieldProperties(path: string[]): ReturnType<typeof getPathProperties> {
    const [root, ...rest] = path;
    const exported = this._exports[root];

    if (!exported) {
      return undefined;
    }
    return getPathProperties(rest, exported);
  }

  /**
   * @example
   *
   * ```ts
   * // 1. { framework: 'framework-name' }
   * // 2. { framework: { name: 'framework-name', options: {} }
   * getNameFromPath(['framework']); // => 'framework-name'
   * ```
   *
   * @returns The name of a node in a given path, supporting the following formats:
   */

  getNameFromPath(path: string[]): string | undefined {
    const node = this.getFieldNode(path);
    if (!node) {
      return undefined;
    }

    return this._getPresetValue(node, 'name');
  }

  /**
   * Returns an array of names of a node in a given path, supporting the following formats:
   *
   * @example
   *
   * ```ts
   * const config = {
   *   addons: ['first-addon', { name: 'second-addon', options: {} }],
   * };
   * // => ['first-addon', 'second-addon']
   * getNamesFromPath(['addons']);
   * ```
   */
  getNamesFromPath(path: string[]): string[] | undefined {
    const node = this.getFieldNode(path);
    if (!node) {
      return undefined;
    }

    const pathNames: string[] = [];
    if (t.isArrayExpression(node)) {
      (node.elements as t.Expression[]).forEach((element) => {
        pathNames.push(this._getPresetValue(element, 'name'));
      });
    }

    return pathNames;
  }

  _getWrappedValue(node: t.Node) {
    if (t.isCallExpression(node)) {
      const arg = node.arguments[0];
      if (t.isStringLiteral(arg)) {
        return arg.value;
      }
    }
    return undefined;
  }

  /**
   * Given a node and a fallback property, returns a **non-evaluated** string value of the node.
   *
   * 1. `{ node: 'value' }`
   * 2. `{ node: { fallbackProperty: 'value' } }`
   */
  _getPresetValue(node: t.Node, fallbackProperty: string) {
    let value;
    if (t.isStringLiteral(node)) {
      value = node.value;
    } else if (t.isObjectExpression(node)) {
      node.properties.forEach((prop) => {
        // { framework: { name: 'value' } }
        if (
          t.isObjectProperty(prop) &&
          t.isIdentifier(prop.key) &&
          prop.key.name === fallbackProperty
        ) {
          if (t.isStringLiteral(prop.value)) {
            value = prop.value.value;
          } else {
            value = this._getWrappedValue(prop.value);
          }
        }

        // { "framework": { "name": "value" } }
        if (
          t.isObjectProperty(prop) &&
          t.isStringLiteral(prop.key) &&
          prop.key.value === 'name' &&
          t.isStringLiteral(prop.value)
        ) {
          value = prop.value.value;
        }
      });
    } else if (t.isCallExpression(node)) {
      value = this._getWrappedValue(node);
    }

    if (!value) {
      throw new Error(
        `The given node must be a string literal or an object expression with a "${fallbackProperty}" property that is a string literal.`
      );
    }

    return value;
  }

  removeField(path: string[]) {
    const removeProperty = (properties: t.ObjectProperty[], prop: string) => {
      const index = properties.findIndex(
        (p) =>
          (t.isIdentifier(p.key) && p.key.name === prop) ||
          (t.isStringLiteral(p.key) && p.key.value === prop)
      );
      if (index >= 0) {
        properties.splice(index, 1);
      }
    };
    // the structure of this._exports doesn't work for this use case
    // so we have to manually bypass it here
    if (path.length === 1) {
      let removedRootProperty = false;
      // removing the root export
      this._ast.program.body.forEach((node) => {
        // named export
        if (t.isExportNamedDeclaration(node) && t.isVariableDeclaration(node.declaration)) {
          const decl = node.declaration.declarations[0];
          if (t.isIdentifier(decl.id) && decl.id.name === path[0]) {
            this._ast.program.body.splice(this._ast.program.body.indexOf(node), 1);
            removedRootProperty = true;
          }
        }
        // default export
        if (t.isExportDefaultDeclaration(node)) {
          const resolved = this._resolveDeclaration(node.declaration as t.Node);
          if (t.isObjectExpression(resolved)) {
            const properties = resolved.properties as t.ObjectProperty[];
            removeProperty(properties, path[0]);
            removedRootProperty = true;
          }
        }
        // module.exports
        if (
          t.isExpressionStatement(node) &&
          t.isAssignmentExpression(node.expression) &&
          t.isMemberExpression(node.expression.left) &&
          t.isIdentifier(node.expression.left.object) &&
          node.expression.left.object.name === 'module' &&
          t.isIdentifier(node.expression.left.property) &&
          node.expression.left.property.name === 'exports' &&
          t.isObjectExpression(node.expression.right)
        ) {
          const properties = node.expression.right.properties as t.ObjectProperty[];
          removeProperty(properties, path[0]);
          removedRootProperty = true;
        }
      });

      if (removedRootProperty) {
        return;
      }
    }

    const properties = this.getFieldProperties(path) as t.ObjectProperty[];
    if (properties) {
      const lastPath = path.at(-1) as string;
      removeProperty(properties, lastPath);
    }
  }

  appendValueToArray(path: string[], value: any) {
    const node = this.valueToNode(value);

    if (node) {
      this.appendNodeToArray(path, node);
    }
  }

  appendNodeToArray(path: string[], node: t.Expression) {
    const current = this.getFieldNode(path);
    if (!current) {
      this.set(path, t.arrayExpression([node]));
    } else if (t.isArrayExpression(current)) {
      current.elements.push(node);
    } else {
      throw new Error(`Expected array at '${path.join('.')}', got '${current.type}'`);
    }
  }

  /**
   * Specialized helper to remove addons or other array entries that can either be strings or
   * objects with a name property.
   */
  removeEntryFromArray(path: string[], value: string) {
    const current = this.getFieldNode(path);

    if (!current) {
      return;
    }
    if (t.isArrayExpression(current)) {
      const index = current.elements.findIndex((element) => {
        if (t.isStringLiteral(element)) {
          return element.value === value;
        }
        if (t.isObjectExpression(element)) {
          const name = this._getPresetValue(element, 'name');
          return name === value;
        }
        return this._getWrappedValue(element as t.Node) === value;
      });
      if (index >= 0) {
        current.elements.splice(index, 1);
      } else {
        throw new Error(`Could not find '${value}' in array at '${path.join('.')}'`);
      }
    } else {
      throw new Error(`Expected array at '${path.join('.')}', got '${current.type}'`);
    }
  }

  _inferQuotes() {
    if (!this._quotes) {
      // Count the raw quote character of each string literal from the AST. Token offsets
      // cannot be trusted here: recast reconstructs the parser input with `os.EOL` line
      // endings, so on Windows the token offsets of an LF-only source point into that CRLF
      // reconstruction and misalign with `this._code`, which made every source infer as
      // double-quoted and printed newly generated nodes with the wrong quotes.
      const occurrences = { "'": 0, '"': 0 };
      const countQuotes = ({ node }: { node: t.Node }) => {
        const raw = (node as t.StringLiteral).extra?.raw;
        if (typeof raw === 'string' && (raw[0] === "'" || raw[0] === '"')) {
          occurrences[raw[0] as "'" | '"'] += 1;
        }
      };
      traverse(this._ast, {
        StringLiteral: { enter: countQuotes },
        DirectiveLiteral: { enter: countQuotes },
      });
      this._quotes = occurrences["'"] > occurrences['"'] ? 'single' : 'double';
    }
    return this._quotes;
  }

  valueToNode(value: any): t.Expression | undefined {
    const quotes = this._inferQuotes();
    let valueNode;
    // we do this rather than types.valueToNode because apparently
    // babel only preserves quotes if they are parsed from the original code.
    if (quotes === 'single') {
      const { code } = generate(t.valueToNode(value), { jsescOption: { quotes } });
      const program = babelParse(`const __x = ${code}`);
      traverse(program, {
        VariableDeclaration: {
          enter({ node }) {
            if (
              node.declarations.length === 1 &&
              t.isVariableDeclarator(node.declarations[0]) &&
              t.isIdentifier(node.declarations[0].id) &&
              node.declarations[0].id.name === '__x'
            ) {
              valueNode = node.declarations[0].init;
            }
          },
        },
      });
    } else {
      // double quotes is the default so we can skip all that
      valueNode = t.valueToNode(value);
    }
    return valueNode;
  }

  getBodyDeclarations(): t.Statement[] {
    return this._ast.program.body;
  }

  /**
   * Edit the first object argument of method calls on a named import, including CommonJS aliases.
   * Unsupported arguments add mutation diagnostics; calls without arguments are ignored.
   *
   * @example
   * ```ts
   * const manager = loadConfig(`
   *   import { addons } from '@aussieljk/forkbook/manager-api';
   *   addons.setConfig({ showNav: false });
   * `).parse();
   * const [object] = manager.callArguments({
   *   importedName: 'addons',
   *   methodName: 'setConfig',
   *   moduleNames: ['@aussieljk/forkbook/manager-api'],
   * });
   * object.group(['layout'], ['showNav']);
   * object.getValue(['layout']); // { showNav: false }
   * manager.changed; // true
   * ```
   */
  callArguments(options: CallArgumentsOptions): readonly CsfObject[] {
    return findCallArguments(
      this._ast,
      options,
      (diagnostic) => this._mutationDiagnostics.push(diagnostic),
      () => {
        this._changed = true;
      }
    );
  }

  setBodyDeclaration(declaration: t.Declaration) {
    this._ast.program.body.push(declaration);
  }

  /**
   * Import specifiers for a specific require import
   *
   * @example
   *
   * ```ts
   * // const { foo } = require('bar');
   * setRequireImport(['foo'], 'bar');
   *
   * // const foo = require('bar');
   * setRequireImport('foo', 'bar');
   * ```
   *
   * @param importSpecifiers - The import specifiers to set. If a string is passed in, a default
   *   import will be set. Otherwise, an array of named imports will be set
   * @param fromImport - The module to import from
   */
  setRequireImport(importSpecifier: string[] | string, fromImport: string) {
    setRequireImport(this._ast.program, importSpecifier, fromImport);
  }

  /**
   * Set import specifiers for a given import statement.
   *
   * Does not support setting type imports (yet)
   *
   * @example
   *
   * ```ts
   * // import { foo } from 'bar';
   * setImport(['foo'], 'bar');
   *
   * // import foo from 'bar';
   * setImport('foo', 'bar');
   *
   * // import * as foo from 'bar';
   * setImport({ namespace: 'foo' }, 'bar');
   *
   * // import 'bar';
   * setImport(null, 'bar');
   * ```
   *
   * @param importSpecifiers - The import specifiers to set. If a string is passed in, a default
   *   import will be set. Otherwise, an array of named imports will be set
   * @param fromImport - The module to import from
   */
  setImport(importSpecifier: ImportSpecifierInput, fromImport: string) {
    setImport(this._ast.program, importSpecifier, fromImport);
  }

  /**
   * Remove import specifiers for a given import statement.
   *
   * Does not support removing type imports (yet)
   *
   * @example
   *
   * ```ts
   * // import { foo } from 'bar';
   * setImport(['foo'], 'bar');
   *
   * // import foo from 'bar';
   * setImport('foo', 'bar');
   *
   * // import * as foo from 'bar';
   * setImport({ namespace: 'foo' }, 'bar');
   *
   * // import 'bar';
   * setImport(null, 'bar');
   * ```
   *
   * @param importSpecifiers - The import specifiers to remove. If a string is passed in, will only
   *   remove the default import. Otherwise, named imports matching the array will be removed.
   * @param fromImport - The module to import from
   */
  removeImport(importSpecifier: ImportSpecifierInput, fromImport: string) {
    removeImport(this._ast.program, importSpecifier, fromImport);
  }
}

export const loadConfig = (code: string, fileName?: string) => {
  const ast = babelParse(code);
  return new ConfigFile(ast, code, fileName);
};

export const formatConfig = (config: ConfigFile): string => {
  return printConfig(config).code;
};

export const printConfig = (config: ConfigFile, options: RecastOptions = {}): PrintResultType => {
  return recast.print(config._ast, {
    quote: config._inferQuotes(),
    // Recast defaults this to `os.EOL`, which would carriage-return printed files on Windows.
    lineTerminator: '\n',
    ...options,
  });
};

export const readConfig = async (fileName: string) => {
  const code = (await readFile(fileName, 'utf-8')).toString();
  return loadConfig(code, fileName).parse();
};

export const writeConfig = async (config: ConfigFile, fileName?: string) => {
  const [diagnostic] = config.mutationDiagnostics;
  invariant(!diagnostic, diagnostic?.message);
  const fname = fileName || config.fileName;

  if (!fname) {
    throw new Error('Please specify a fileName for writeConfig');
  }
  await writeFile(fname, formatConfig(config));
};

export const isCsfFactoryPreview = (previewConfig: ConfigFile) => {
  const program = previewConfig._ast.program;
  return !!program.body.find((node) => {
    return (
      t.isImportDeclaration(node) &&
      (node.source.value.includes('storybook') || node.source.value.includes('forkbook')) &&
      node.specifiers.some((specifier) => {
        return (
          t.isImportSpecifier(specifier) &&
          t.isIdentifier(specifier.imported) &&
          specifier.imported.name === 'definePreview'
        );
      })
    );
  });
};
