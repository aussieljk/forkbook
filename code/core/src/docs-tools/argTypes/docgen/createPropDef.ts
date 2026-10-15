import { convert } from '../convert.ts';
import type { JsDocParsingResult } from '../jsdocParser.ts';
import { createSummaryValue } from '../utils.ts';
import type { JsDocParam } from './PropDef.ts';
import type { DocgenInfo, PropDef } from './types.ts';

/** Docgen gives these default values as text, but they are the same as no default value. */
const EMPTY_DEFAULT_VALUES = ['null', 'undefined'];

export function createPropDef(
  name: string,
  docgenInfo: DocgenInfo,
  jsDocParsingResult: JsDocParsingResult
): PropDef {
  const { type, description, required, defaultValue } = docgenInfo;

  const propDef: PropDef = {
    name,
    type: createSummaryValue(type.name),
    sbType: convert(type),
    required,
    description,
    defaultValue:
      defaultValue != null && !EMPTY_DEFAULT_VALUES.includes(defaultValue.value)
        ? createSummaryValue(defaultValue.value)
        : null,
  };

  if (jsDocParsingResult.includesJsDoc) {
    const { extractedTags } = jsDocParsingResult;

    if (jsDocParsingResult.description != null) {
      propDef.description = jsDocParsingResult.description;
    }

    const jsDocTags = {
      ...extractedTags,
      params: extractedTags?.params?.map((param): JsDocParam => ({
        name: param.getPrettyName(),
        description: param.description,
      })),
    };

    if (Object.values(jsDocTags).some(Boolean)) {
      propDef.jsDocTags = jsDocTags;
    }
  }

  return propDef;
}
