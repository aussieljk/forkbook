/**
 * Adds the story file path below the first line of an error message, so the error display in the
 * preview says which file to fix. The view shows the first line as the heading and the rest as
 * detail, so the stack moves into the detail.
 */
export function withFilePath(
  error: { message?: string; stack?: string },
  importPath: string | undefined
): { message: string; stack: string } {
  const message = error.message || String(error);
  const stack = error.stack ?? '';
  if (!importPath || message.includes(importPath)) {
    return { message, stack };
  }
  const [header, ...rest] = message.split('\n');
  const detail = rest.length ? rest.join('\n').replace(/^\n/, '') : stack;
  return { message: `${header}\nIn ${importPath}\n\n${detail}`.trimEnd(), stack };
}
