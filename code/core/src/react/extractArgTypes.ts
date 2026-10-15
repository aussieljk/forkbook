import type {
  ArgTypesExtractor,
  ExtractedProp,
  PropDef,
} from '@aussieljk/forkbook/internal/docs-tools';
import { createSummaryValue, extractComponentProps } from '@aussieljk/forkbook/internal/docs-tools';
import type { StrictArgTypes } from '@aussieljk/forkbook/internal/types';

import { createDefaultValue } from './docs/lib/defaultValues/index.ts';

/** Makes the type and the default value of a prop easier to read in the args table. */
function enhanceProp({ propDef, docgenInfo }: ExtractedProp): PropDef {
  const { type, defaultValue } = docgenInfo;

  // Show the values of an enum, for example `"small" | "large"`, not the word `enum`.
  if (type.name === 'enum' && Array.isArray(type.value)) {
    propDef.type = createSummaryValue(
      type.value.map(({ value }: { value: string }) => value).join(' | ')
    );
  }

  if (defaultValue?.value != null) {
    propDef.defaultValue = createDefaultValue(defaultValue.value) ?? propDef.defaultValue;
  }

  return propDef;
}

export const extractArgTypes: ArgTypesExtractor = (component): StrictArgTypes | null => {
  if (!component) {
    return null;
  }

  const rows = extractComponentProps(component, 'props').map(enhanceProp);
  return Object.fromEntries(
    rows.map(({ name, description, type, sbType, defaultValue, jsDocTags, required }) => [
      name,
      {
        name,
        description,
        type: { required, ...sbType },
        table: {
          type: type ?? undefined,
          jsDocTags,
          defaultValue: defaultValue ?? undefined,
        },
      },
    ])
  );
};
