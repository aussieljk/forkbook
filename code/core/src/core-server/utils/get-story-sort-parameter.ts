import { generate } from '@aussieljk/forkbook/internal/babel';
import { loadConfig } from '@aussieljk/forkbook/internal/csf-tools';
import { once } from '@aussieljk/forkbook/internal/node-logger';
import type { Addon_StorySortParameterV7 } from '@aussieljk/forkbook/internal/types';

import { transformSync } from 'rolldown/utils';
import { dedent } from 'ts-dedent';

const STORY_SORT_PATH = ['parameters', 'options', 'storySort'];

/**
 * Reads `parameters.options.storySort` from the preview file source, without running the preview.
 * A static object or array is read as a value. A function is printed, its types are removed and it
 * is evaluated alone, so it must not use variables from the rest of the preview file.
 */
export function getStorySortParameter(
  previewCode: string | undefined
): Addon_StorySortParameterV7 | undefined {
  if (!previewCode || !previewCode.includes('storySort')) {
    return undefined;
  }

  let node;
  let config;
  try {
    config = loadConfig(previewCode).parse();
    node = config.get(STORY_SORT_PATH);
  } catch {
    return undefined;
  }
  if (!node) {
    return undefined;
  }

  // `get` can return an object method (`storySort(a, b) {}`), which its type does not show.
  const nodeType: string = node.type;
  if (
    nodeType === 'ArrowFunctionExpression' ||
    nodeType === 'FunctionExpression' ||
    nodeType === 'ObjectMethod'
  ) {
    try {
      const source = generate(node).code;
      const wrapped = `export default (${nodeType === 'ObjectMethod' ? `function ${source}` : source});`;
      const { code, errors } = transformSync('story-sort.tsx', wrapped, { lang: 'tsx' });
      if (errors.length) {
        throw new Error(errors[0].message);
      }
      const body = code.replace(/export default\s*/, 'return ');
      return new Function(body)() as Addon_StorySortParameterV7;
    } catch (err) {
      once.warn(dedent`
        Unable to evaluate parameters.options.storySort from the preview file. The function must
        not use imports or variables from outside its body.

        ${String(err)}
      `);
      return undefined;
    }
  }

  const value = config.getValue(STORY_SORT_PATH);
  if (value && typeof value === 'object') {
    return value as Addon_StorySortParameterV7;
  }
  once.warn(dedent`
    Unable to read parameters.options.storySort from the preview file. Use an inline object, for
    example { order: ['Intro', 'Components'] }, or an inline function.
  `);
  return undefined;
}
