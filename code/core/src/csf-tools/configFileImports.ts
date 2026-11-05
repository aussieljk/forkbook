import { types as t } from '@aussieljk/forkbook/internal/babel';

/**
 * The import to set or remove: a default import name, named imports, a namespace import, or `null`
 * for a side-effect import.
 */
export type ImportSpecifierInput = string[] | string | { namespace: string } | null;

type RecastComment = t.Comment & { leading?: boolean };
type CommentedStatement = t.Statement & { comments?: RecastComment[] };

const NEXT_LINE_DIRECTIVE =
  /^\s*(@ts-(expect-error|ignore)|[a-z]+-disable-next-line|prettier-ignore|biome-ignore)\b/;

/**
 * Return the leading comments of a program's first statement that form the file header. A
 * directive that applies only to that statement, such as `@ts-expect-error`, ends the header.
 */
export const getHeaderComments = (statement: t.Statement | undefined): RecastComment[] => {
  const comments = (statement as CommentedStatement | undefined)?.comments ?? [];
  const leading = comments.filter((comment) => comment.leading);
  const directive = leading.findIndex(({ value }) => NEXT_LINE_DIRECTIVE.test(value));
  return directive === -1 ? leading : leading.slice(0, directive);
};

// A license header has to stay first: add below the existing imports, or take the header over
// when there are none.
const prependStatement = (program: t.Program, statement: t.Statement) => {
  const first: CommentedStatement | undefined = program.body[0];
  const header = getHeaderComments(first);
  if (!first || !header.length) {
    program.body.unshift(statement);
    return;
  }
  const firstNonImport = program.body.findIndex((node) => !t.isImportDeclaration(node));
  const index = firstNonImport === -1 ? program.body.length : firstNonImport;
  if (index === 0) {
    const notHeader = (comment: t.Comment) => !header.includes(comment);
    first.comments = first.comments?.filter(notHeader);
    first.leadingComments = first.leadingComments?.filter(notHeader);
    Object.assign(statement, { comments: header, leadingComments: header });
  }
  program.body.splice(index, 0, statement);
};

/** `node:fs` also matches an existing `fs` import. */
const isSameModule = (source: string, fromImport: string) =>
  source === fromImport || source === fromImport.split('node:')[1];

/** The source of a single `const x = require('source')` declaration, if it is one. */
const getRequireSource = (node: t.Statement): string | undefined => {
  if (!t.isVariableDeclaration(node) || node.declarations.length !== 1) {
    return undefined;
  }
  const { init } = node.declarations[0];
  if (
    t.isCallExpression(init) &&
    t.isIdentifier(init.callee, { name: 'require' }) &&
    t.isStringLiteral(init.arguments[0])
  ) {
    return init.arguments[0].value;
  }
  return undefined;
};

const findRequireIndex = (program: t.Program, fromImport: string) =>
  program.body.findIndex((node) => {
    const source = getRequireSource(node);
    return source !== undefined && isSameModule(source, fromImport);
  });

const findImportIndex = (program: t.Program, fromImport: string) =>
  program.body.findIndex(
    (node) => t.isImportDeclaration(node) && isSameModule(node.source.value, fromImport)
  );

const requireCall = (fromImport: string) =>
  t.callExpression(t.identifier('require'), [t.stringLiteral(fromImport)]);

const shorthandProperty = (name: string) =>
  t.objectProperty(t.identifier(name), t.identifier(name), undefined, true);

/** Add `const foo = require('bar')` (string) or `const { foo } = require('bar')` (array). */
export const setRequireImport = (
  program: t.Program,
  importSpecifier: string[] | string,
  fromImport: string
) => {
  const index = findRequireIndex(program, fromImport);
  const requireDeclaration =
    index === -1 ? undefined : (program.body[index] as t.VariableDeclaration);
  // Keep the spelling of the existing require (`fs` or `node:fs`).
  const source = requireDeclaration ? (getRequireSource(requireDeclaration) as string) : fromImport;
  const declarator = requireDeclaration?.declarations[0];

  if (typeof importSpecifier === 'string') {
    if (!t.isIdentifier(declarator?.id, { name: importSpecifier })) {
      prependStatement(
        program,
        t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier(importSpecifier), requireCall(source)),
        ])
      );
    }
    return;
  }

  if (declarator) {
    const pattern = declarator.id as t.ObjectPattern;
    importSpecifier.forEach((specifier) => {
      const exists =
        t.isObjectPattern(pattern) &&
        pattern.properties.some(
          (property) =>
            t.isObjectProperty(property) && t.isIdentifier(property.key, { name: specifier })
        );
      if (!exists) {
        pattern.properties.push(shorthandProperty(specifier));
      }
    });
    return;
  }

  prependStatement(
    program,
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern(importSpecifier.map(shorthandProperty)),
        requireCall(source)
      ),
    ])
  );
};

type ImportDeclarationSpecifier = t.ImportDeclaration['specifiers'][number];

const matchesSpecifier = (
  current: ImportDeclarationSpecifier,
  importSpecifier: ImportSpecifierInput
) => {
  if (importSpecifier === null) {
    return false;
  }
  if (typeof importSpecifier === 'string') {
    return t.isImportDefaultSpecifier(current) && current.local.name === importSpecifier;
  }
  if (Array.isArray(importSpecifier)) {
    return (
      t.isImportSpecifier(current) &&
      t.isIdentifier(current.imported) &&
      importSpecifier.includes(current.imported.name)
    );
  }
  return t.isImportNamespaceSpecifier(current) && current.local.name === importSpecifier.namespace;
};

const hasSpecifier = (declaration: t.ImportDeclaration, importSpecifier: ImportSpecifierInput) =>
  declaration.specifiers.some((current) => matchesSpecifier(current, importSpecifier));

const namedSpecifier = (name: string) => t.importSpecifier(t.identifier(name), t.identifier(name));

/** Add an import. Does not support type imports. */
export const setImport = (
  program: t.Program,
  importSpecifier: ImportSpecifierInput,
  fromImport: string
) => {
  const index = findImportIndex(program, fromImport);
  const importDeclaration = index === -1 ? undefined : (program.body[index] as t.ImportDeclaration);

  if (importSpecifier === null) {
    if (!importDeclaration) {
      prependStatement(program, t.importDeclaration([], t.stringLiteral(fromImport)));
    }
    return;
  }

  if (Array.isArray(importSpecifier)) {
    if (importDeclaration) {
      importSpecifier
        .filter((name) => !hasSpecifier(importDeclaration, [name]))
        .forEach((name) => importDeclaration.specifiers.push(namedSpecifier(name)));
    } else {
      prependStatement(
        program,
        t.importDeclaration(importSpecifier.map(namedSpecifier), t.stringLiteral(fromImport))
      );
    }
    return;
  }

  const specifier =
    typeof importSpecifier === 'string'
      ? t.importDefaultSpecifier(t.identifier(importSpecifier))
      : t.importNamespaceSpecifier(t.identifier(importSpecifier.namespace));
  if (!importDeclaration) {
    prependStatement(program, t.importDeclaration([specifier], t.stringLiteral(fromImport)));
  } else if (!hasSpecifier(importDeclaration, importSpecifier)) {
    importDeclaration.specifiers.push(specifier);
  }
};

const removeRequireImport = (
  program: t.Program,
  importSpecifier: ImportSpecifierInput,
  fromImport: string
) => {
  const index = findRequireIndex(program, fromImport);
  // require() has no side-effect-only or namespace form.
  if (index === -1 || importSpecifier === null) {
    return;
  }
  const declarator = (program.body[index] as t.VariableDeclaration).declarations[0];

  // const foo = require('bar')
  if (typeof importSpecifier === 'string') {
    if (t.isIdentifier(declarator.id, { name: importSpecifier })) {
      program.body.splice(index, 1);
    }
    return;
  }

  // const { foo, bar } = require('baz')
  if (Array.isArray(importSpecifier) && t.isObjectPattern(declarator.id)) {
    const pattern = declarator.id;
    pattern.properties = pattern.properties.filter(
      (property) =>
        !(
          t.isObjectProperty(property) &&
          t.isIdentifier(property.key) &&
          importSpecifier.includes(property.key.name)
        )
    );
    if (pattern.properties.length === 0) {
      program.body.splice(index, 1);
    }
  }
};

const removeEsmImport = (
  program: t.Program,
  importSpecifier: ImportSpecifierInput,
  fromImport: string
) => {
  const index = findImportIndex(program, fromImport);
  if (index === -1) {
    return;
  }
  const importDeclaration = program.body[index] as t.ImportDeclaration;

  // A side-effect import is removed only when it has no specifiers.
  if (importSpecifier !== null) {
    importDeclaration.specifiers = importDeclaration.specifiers.filter(
      (current) => !matchesSpecifier(current, importSpecifier)
    );
  }

  if (importDeclaration.specifiers.length === 0) {
    program.body.splice(index, 1);
  }
};

/** Remove an import or require. Does not support type imports. */
export const removeImport = (
  program: t.Program,
  importSpecifier: ImportSpecifierInput,
  fromImport: string
) => {
  removeRequireImport(program, importSpecifier, fromImport);
  removeEsmImport(program, importSpecifier, fromImport);
};
