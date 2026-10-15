import { describe, expect, test } from 'vitest';
import { parseReactComponentMeta as parseComponentMeta } from './parse-component-meta.ts';

/**
 * The fixtures below carry fields (`displayName`, `name`, nullable defaults) that the parser type
 * does not declare. The cast keeps the fixtures the same as the payloads in production.
 */
const parseReactComponentMeta = (input: unknown) =>
  parseComponentMeta(input as Parameters<typeof parseComponentMeta>[0]);

describe('parseReactComponentMeta', () => {
  test('parses basic props with type.name', () => {
    const result = parseReactComponentMeta({
      displayName: 'Button',
      filePath: 'src/Button.tsx',
      description: 'A button component',
      methods: [],
      props: {
        label: {
          name: 'label',
          description: 'The button label',
          type: { name: 'string' },
          defaultValue: null,
          required: true,
        },
        disabled: {
          name: 'disabled',
          description: 'Whether the button is disabled',
          type: { name: 'boolean' },
          defaultValue: { value: 'false' },
          required: false,
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
			{
			  "props": {
			    "disabled": {
			      "defaultValue": "false",
			      "description": "Whether the button is disabled",
			      "required": false,
			      "type": "boolean",
			    },
			    "label": {
			      "defaultValue": undefined,
			      "description": "The button label",
			      "required": true,
			      "type": "string",
			    },
			  },
			}
		`);
  });

  test('prefers type.raw over type.name for enums', () => {
    const result = parseReactComponentMeta({
      displayName: 'Button',
      filePath: 'src/Button.tsx',
      description: '',
      methods: [],
      props: {
        variant: {
          name: 'variant',
          description: 'The variant',
          type: {
            name: 'enum',
            raw: '"primary" | "secondary" | "danger"',
            value: [{ value: '"primary"' }, { value: '"secondary"' }, { value: '"danger"' }],
          },
          defaultValue: { value: 'primary' },
          required: false,
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
			{
			  "props": {
			    "variant": {
			      "defaultValue": "primary",
			      "description": "The variant",
			      "required": false,
			      "type": ""primary" | "secondary" | "danger"",
			    },
			  },
			}
		`);
  });

  test('falls back to type.name when type.raw is not present', () => {
    const result = parseReactComponentMeta({
      displayName: 'Callback',
      filePath: 'src/Callback.tsx',
      description: '',
      methods: [],
      props: {
        onClick: {
          name: 'onClick',
          description: 'Click handler',
          type: { name: '(event: MouseEvent) => void' },
          defaultValue: null,
          required: true,
        },
      },
    });
    expect(result).toMatchInlineSnapshot(`
			{
			  "props": {
			    "onClick": {
			      "defaultValue": undefined,
			      "description": "Click handler",
			      "required": true,
			      "type": "(event: MouseEvent) => void",
			    },
			  },
			}
		`);
  });

  test('handles empty description as undefined', () => {
    const result = parseReactComponentMeta({
      displayName: 'Box',
      filePath: 'src/Box.tsx',
      description: '',
      methods: [],
      props: {
        children: {
          name: 'children',
          description: '',
          type: { name: 'ReactNode' },
          defaultValue: null,
          required: false,
        },
      },
    });
    expect(result.props.children!.description).toBeUndefined();
  });

  test('handles empty props object', () => {
    const result = parseReactComponentMeta({
      displayName: 'Empty',
      filePath: 'src/Empty.tsx',
      description: '',
      methods: [],
      props: {},
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "props": {},
      }
    `);
  });
});

describe('parseReactComponentMeta component tags', () => {
  const parseComponentDocLike = parseReactComponentMeta;

  test('normalizes flat tag values into arrays', () => {
    const result = parseComponentDocLike({
      displayName: 'Button',
      filePath: 'src/Button.tsx',
      description: '',
      methods: [],
      tags: {
        deprecated: 'Use NewButton instead.',
        since: '1.2.3',
      },
      props: {},
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "props": {},
        "tags": {
          "deprecated": [
            "Use NewButton instead.",
          ],
          "since": [
            "1.2.3",
          ],
        },
      }
    `);
  });

  test('omits tags when the component has no tags', () => {
    const result = parseComponentDocLike({
      displayName: 'Button',
      filePath: 'src/Button.tsx',
      description: '',
      methods: [],
      props: {},
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "props": {},
      }
    `);
  });

  test('renders non-string tag values instead of dropping them', () => {
    const result = parseComponentDocLike({
      displayName: 'Button',
      filePath: 'src/Button.tsx',
      description: '',
      methods: [],
      tags: {
        deprecated: 'Use NewButton instead.',
        since: 123,
        see: null,
        author: ['Ada', 'Grace'],
        meta: { owner: 'design-system' },
        experimental: true,
      },
      props: {},
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "props": {},
        "tags": {
          "author": [
            "Ada",
            "Grace",
          ],
          "deprecated": [
            "Use NewButton instead.",
          ],
          "experimental": [
            "true",
          ],
          "meta": [
            "{"owner":"design-system"}",
          ],
          "see": [
            "",
          ],
          "since": [
            "123",
          ],
        },
      }
    `);
  });
});
