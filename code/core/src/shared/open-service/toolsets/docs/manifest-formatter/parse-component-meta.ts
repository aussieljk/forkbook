/**
 * Parses the `reactComponentMeta` docgen payload into a simple props list. The dev server and the
 * hosted `@aussieljk/forkbook/mcp` package (which bundles this entry) both use this parser. The types below
 * are only the fields that the parser reads.
 */

export type ParsedDocgen = {
  tags?: Record<string, string[]>;
  props: Record<
    string,
    {
      description?: string;
      type?: string;
      defaultValue?: string;
      required?: boolean;
    }
  >;
};

/** The fields of a `reactComponentMeta` payload that the parser reads. */
type ComponentMetaDoc = {
  tags?: Record<string, unknown>;
  props?: Record<
    string,
    {
      description?: string;
      required?: boolean;
      type?: { name?: string; raw?: string };
      defaultValue?: { value?: string } | null;
    }
  >;
};

const tagValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(tagValues);
  }
  if (value === null || value === undefined) {
    return [''];
  }
  return [typeof value === 'object' ? JSON.stringify(value) : String(value)];
};

export const parseReactComponentMeta = (componentDoc: ComponentMetaDoc): ParsedDocgen => {
  const props = componentDoc.props ?? {};
  const tags = Object.fromEntries(
    Object.entries(componentDoc.tags ?? {}).map(([tagName, value]) => [tagName, tagValues(value)])
  );
  const parsedDocgen: ParsedDocgen = {
    props: Object.fromEntries(
      Object.entries(props).map(([propName, prop]) => [
        propName,
        {
          description: prop.description || undefined,
          // `type.raw` has the full union for enums. Other types have only `type.name`.
          type: prop.type?.raw ?? prop.type?.name,
          defaultValue: prop.defaultValue?.value,
          required: prop.required,
        },
      ])
    ),
  };

  if (Object.keys(tags).length > 0) {
    parsedDocgen.tags = tags;
  }

  return parsedDocgen;
};
