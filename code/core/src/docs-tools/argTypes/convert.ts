import type { SBType } from '@aussieljk/forkbook/internal/types';

import type { DocgenType } from './docgen/types.ts';

const FUNCTION_SIGNATURE = /^\(.*\) => /;
const QUOTES = /^['"]|['"]$/g;

/** Gets the value of a string or number literal, for example `"small"` or `1`. */
function parseLiteral(literal: string) {
  const trimmed = literal.replace(QUOTES, '');
  const hasQuotes = trimmed !== literal;
  return hasQuotes || Number.isNaN(Number(trimmed)) ? trimmed : Number(trimmed);
}

/** Converts a docgen `type` into the `SBType` that Controls use to select a control. */
export function convert({ name, raw, value }: DocgenType): SBType {
  const base = raw !== undefined ? { raw } : {};

  switch (name) {
    case 'enum':
      return { ...base, name, value: value.map((v: { value: string }) => parseLiteral(v.value)) };
    case 'string':
    case 'number':
    case 'symbol':
    case 'boolean':
    case 'object':
      return { ...base, name } as SBType;
    default: {
      if (name.indexOf('|') > 0) {
        // A union of literals that is not an enum, for example `1 | 2 | null`.
        try {
          return { ...base, name: 'enum', value: name.split('|').map((v) => JSON.parse(v)) };
        } catch {
          // The union has members that are not literals.
        }
      }
      const isFunction = FUNCTION_SIGNATURE.test(name);
      return { ...base, name: isFunction ? 'function' : 'other', value: name } as SBType;
    }
  }
}
