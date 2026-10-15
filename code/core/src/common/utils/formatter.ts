import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import * as find from 'empathic/find';
import { parse } from 'jsonc-parser';
import { type FormatConfig, format } from 'oxfmt';

const CONFIG_FILES = ['.oxfmtrc.json', '.oxfmtrc.jsonc'];

/** Format code with oxfmt. If oxfmt cannot format it, the code is returned as is. */
export async function formatCode(
  filePath: string,
  content: string,
  options: FormatConfig = {}
): Promise<string> {
  try {
    const { code, errors } = await format(filePath, content, options);
    return errors.length > 0 ? content : code;
  } catch {
    return content;
  }
}

/**
 * Format a file of the project with oxfmt and the nearest oxfmt config. Without a config, the
 * content is returned as is, because the defaults would change the style of the whole file.
 */
export async function formatFileContent(filePath: string, content: string): Promise<string> {
  const configPath = find.any(CONFIG_FILES, { cwd: dirname(filePath) });
  if (!configPath) {
    return content;
  }

  // Keys that select files are not format options.
  const { $schema, ignorePatterns, overrides, ...options } = parse(
    readFileSync(configPath, 'utf8')
  );
  return formatCode(filePath, content, options);
}
