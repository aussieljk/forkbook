import { convert } from '../convert/index.ts';
import type { JsDocParsingResult } from '../jsdocParser.ts';
import { createSummaryValue } from '../utils.ts';
import type { JsDocParam, PropDefaultValue } from './PropDef.ts';
import { createFlowPropDef } from './flow/createPropDef.ts';
import { createTsPropDef } from './typeScript/createPropDef.ts';
import type { DocgenInfo, DocgenPropDefaultValue, DocgenType, PropDef } from './types.ts';
import { TypeSystem } from './types.ts';
import { isDefaultValueBlacklisted } from './utils/defaultValue.ts';

export type PropDefFactory = (
  propName: string,
  docgenInfo: DocgenInfo,
  jsDocParsingResult?: JsDocParsingResult
) => PropDef;

function createType(type: DocgenType) {
  // A type could be null if a defaultProp has been provided without a type definition.
  return type != null ? createSummaryValue(type.name) : null;
}

function createDefaultValue(defaultValue: DocgenPropDefaultValue): PropDefaultValue | null {
  if (defaultValue != null && !isDefaultValueBlacklisted(defaultValue.value)) {
    return createSummaryValue(defaultValue.value);
  }
  return null;
}

function createBasicPropDef(name: string, type: DocgenType, docgenInfo: DocgenInfo): PropDef {
  const { description, required, defaultValue } = docgenInfo;

  return {
    name,
    type: createType(type),
    required,
    description,
    defaultValue: createDefaultValue(defaultValue),
  };
}

function applyJsDocResult(propDef: PropDef, jsDocParsingResult?: JsDocParsingResult): PropDef {
  if (jsDocParsingResult?.includesJsDoc) {
    const { description, extractedTags } = jsDocParsingResult;

    if (description != null) {
      propDef.description = jsDocParsingResult.description;
    }

    const value = {
      ...extractedTags,
      params: extractedTags?.params?.map((x): JsDocParam => ({
        name: x.getPrettyName(),
        description: x.description,
      })),
    };

    if (Object.values(value).filter(Boolean).length > 0) {
      propDef.jsDocTags = value;
    }
  }

  return propDef;
}

export const javaScriptFactory: PropDefFactory = (propName, docgenInfo, jsDocParsingResult) => {
  const propDef = createBasicPropDef(propName, docgenInfo.type, docgenInfo);
  propDef.sbType = convert(docgenInfo);

  return applyJsDocResult(propDef, jsDocParsingResult);
};

export const tsFactory: PropDefFactory = (propName, docgenInfo, jsDocParsingResult) => {
  const propDef = createTsPropDef(propName, docgenInfo);
  propDef.sbType = convert(docgenInfo);

  return applyJsDocResult(propDef, jsDocParsingResult);
};

export const flowFactory: PropDefFactory = (propName, docgenInfo, jsDocParsingResult) => {
  const propDef = createFlowPropDef(propName, docgenInfo);
  propDef.sbType = convert(docgenInfo);

  return applyJsDocResult(propDef, jsDocParsingResult);
};

export const unknownFactory: PropDefFactory = (propName, docgenInfo, jsDocParsingResult) => {
  const propDef = createBasicPropDef(propName, { name: 'unknown' }, docgenInfo);

  return applyJsDocResult(propDef, jsDocParsingResult);
};

export const getPropDefFactory = (typeSystem: TypeSystem): PropDefFactory => {
  switch (typeSystem) {
    case TypeSystem.JAVASCRIPT:
      return javaScriptFactory;
    case TypeSystem.TYPESCRIPT:
      return tsFactory;
    case TypeSystem.FLOW:
      return flowFactory;
    default:
      return unknownFactory;
  }
};
