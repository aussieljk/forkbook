import { codeFrameColumns } from '@babel/code-frame';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

/** A parsed file with its Program path, like the `File` of @babel/core. */
export interface BabelFile {
  ast: t.File;
  code: string;
  opts: { filename?: string };
  path: NodePath<t.Program>;
}

/**
 * Makes the Program path of `ast` the same way the `File` class of @babel/core does, without
 * @babel/core. The hub gives `path.buildCodeFrameError` a code frame from `code`.
 */
export function createBabelFile({
  code,
  ast,
  filename,
}: {
  code: string;
  ast: t.File;
  filename?: string;
}): BabelFile {
  const buildError = (node: t.Node | undefined, message: string, ErrorClass = SyntaxError) => {
    let loc = node?.loc;
    if (!loc && node) {
      t.traverseFast(node, (child) => {
        if (child.loc) {
          loc = child.loc;
          return t.traverseFast.stop;
        }
      });
      message += ` (This is an error on an internal node. Probably an internal error.${loc ? ' Location has been estimated.' : ''})`;
    }
    if (loc) {
      message += `\n${codeFrameColumns(
        code,
        {
          start: { line: loc.start.line, column: loc.start.column + 1 },
          end:
            loc.end && loc.start.line === loc.end.line
              ? { line: loc.end.line, column: loc.end.column + 1 }
              : undefined,
        },
        { highlightCode: false }
      )}`;
    }
    return new ErrorClass(message);
  };

  const file = { ast, code, opts: { filename } } as BabelFile;
  const hub = {
    file,
    getCode: () => code,
    getScope: () => file.path.scope,
    addHelper: () => {
      throw new Error('Babel helpers are not available here');
    },
    buildError,
  };
  file.path = (NodePath as any)
    .get({ hub, parentPath: null, parent: ast, container: ast, key: 'program' })
    .setContext();
  return file;
}
