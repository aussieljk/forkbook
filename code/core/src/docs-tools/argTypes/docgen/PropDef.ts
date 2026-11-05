// FIXME: this is legacy code that needs to be updated & simplified with ArgType refactor

export interface JsDocParam {
  name: string | undefined | null;
  description?: string | null;
}

export interface JsDocReturns {
  description?: string | null;
}

export interface JsDocTags {
  params?: JsDocParam[] | null;
  returns?: JsDocReturns | null;
}

export interface PropSummaryValue {
  summary?: string | undefined;
  detail?: string | undefined;
}

export type PropType = PropSummaryValue;
export type PropDefaultValue = PropSummaryValue;

export interface PropDef {
  name: string;
  type: PropType | null;
  // TODO: type as `SBType` when `react/extractArgTypes.ts` handles a missing `sbType`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sbType?: any;
  required: boolean;
  description?: string;
  defaultValue?: PropDefaultValue | null;
  jsDocTags?: JsDocTags;
}
