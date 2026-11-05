import { types as t } from '@aussieljk/forkbook/internal/babel';

/** Find the top-level `const` / `let` / `var` declarator of a name, exported or not. */
export const findVarDeclarator = (
  identifier: string,
  program: t.Program
): t.VariableDeclarator | undefined => {
  for (const node of program.body) {
    const declaration = t.isExportNamedDeclaration(node) ? node.declaration : node;
    if (!t.isVariableDeclaration(declaration)) {
      continue;
    }
    const declarator = declaration.declarations.find(
      (decl) => t.isIdentifier(decl.id) && decl.id.name === identifier
    );
    if (declarator) {
      return declarator;
    }
  }
  return undefined;
};

export const findVarInitialization = (identifier: string, program: t.Program) =>
  findVarDeclarator(identifier, program)?.init ?? undefined;
