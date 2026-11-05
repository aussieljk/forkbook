import type { Args, Conditional, Globals } from '@aussieljk/forkbook/internal/types';

import type { Options } from '../../controls/types.ts';

// TODO ?
export interface JsDocParam {
  name: string;
  description?: string;
}

export interface JsDocParamDeprecated {
  deprecated?: string;
}

export interface JsDocReturns {
  description?: string;
}

export interface JsDocTags {
  params?: JsDocParam[];
  deprecated?: JsDocParamDeprecated;
  returns?: JsDocReturns;
}

export interface PropSummaryValue {
  summary: string | undefined;
  detail?: string | undefined;
  required?: boolean;
}

export type PropType = PropSummaryValue;
export type PropDefaultValue = PropSummaryValue;

export interface TableAnnotation {
  type: PropType;
  jsDocTags?: JsDocTags;
  defaultValue?: PropDefaultValue;
  category?: string;
}

/** The control of an args table row. Forkbook normalizes a control name to `{ type }`. */
export interface ArgControlType {
  type?: string;
  disable?: boolean;
  [key: string]: unknown;
}

/** One row of the args table: an arg type, with the key of its arg. */
export interface ArgType {
  key?: string;
  name?: string;
  description?: string;
  if?: Conditional;
  type?: { name?: string; required?: boolean } | string;
  control?: ArgControlType | string | false;
  options?: Options;
  table?: {
    category?: string;
    disable?: boolean;
    subcategory?: string;
    defaultValue?: {
      summary?: string | undefined;
      detail?: string | undefined;
    };
    type?: {
      summary?: string | undefined;
      detail?: string | undefined;
    };
    readonly?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** An args table row after grouping, which always has its key. */
export type ArgRowType = ArgType & { key: string };

export interface ArgTypes {
  [key: string]: ArgType;
}

export type { Args, Globals };
