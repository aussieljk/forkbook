import type { ExtractedJsDoc } from '../jsdocParser.ts';
import { parseJsDoc } from '../jsdocParser.ts';
import type { Component } from '../types.ts';
import { createPropDef } from './createPropDef.ts';
import type { DocgenInfo, PropDef } from './types.ts';
import { getDocgenDescription, getDocgenSection } from './utils/index.ts';

export interface ExtractedProp {
  propDef: PropDef;
  docgenInfo: DocgenInfo;
  jsDocTags?: ExtractedJsDoc;
}

/** Gets the props of `component.__docgenInfo[section]`, without the props marked `@ignore`. */
export function extractComponentProps(component: Component, section: string): ExtractedProp[] {
  const docgenSection: Record<string, DocgenInfo> | null = getDocgenSection(component, section);
  if (docgenSection == null) {
    return [];
  }

  return Object.entries(docgenSection).flatMap(([propName, docgenInfo]) => {
    if (docgenInfo == null) {
      return [];
    }
    const jsDocParsingResult = parseJsDoc(docgenInfo.description);
    if (jsDocParsingResult.includesJsDoc && jsDocParsingResult.ignore) {
      return [];
    }
    return [
      {
        propDef: createPropDef(propName, docgenInfo, jsDocParsingResult),
        jsDocTags: jsDocParsingResult.extractedTags,
        docgenInfo,
      },
    ];
  });
}

export function extractComponentDescription(component?: Component): string {
  return component != null ? getDocgenDescription(component) : '';
}
