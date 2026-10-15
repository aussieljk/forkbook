import type { StrictArgTypes } from '@aussieljk/forkbook/internal/types';

import type { Component } from '../types.ts';
import type { PropDef } from './PropDef.ts';

export type ArgTypesExtractor = (component: Component) => StrictArgTypes | null;

export interface DocgenType {
  name: string;
  raw?: string;
  /** For `enum`: the source text of each literal, for example `[{ value: '"small"' }]`. */
  value?: any;
}

export interface DocgenPropDefaultValue {
  value: string;
}

export interface DocgenInfo {
  type: DocgenType;
  required: boolean;
  description: string;
  defaultValue: DocgenPropDefaultValue | null;
}

export type { PropDef };
