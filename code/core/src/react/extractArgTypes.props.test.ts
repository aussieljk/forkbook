import { describe, expect, it } from 'vitest';

import { extractArgTypes } from './extractArgTypes.ts';

function extractDefaultValue(defaultValue: string) {
  const argTypes = extractArgTypes({
    __docgenInfo: {
      props: {
        prop: {
          type: { name: 'string' },
          required: false,
          description: '',
          defaultValue: { value: defaultValue },
        },
      },
    },
  });
  return argTypes?.prop.table?.defaultValue;
}

describe('extractArgTypes', () => {
  it('should show the values of an enum as the type', () => {
    const argTypes = extractArgTypes({
      __docgenInfo: {
        props: {
          size: {
            type: {
              name: 'enum',
              raw: '"small" | "large"',
              value: [{ value: '"small"' }, { value: '"large"' }],
            },
            required: true,
            description: '',
            defaultValue: null,
          },
        },
      },
    });

    expect(argTypes?.size).toEqual({
      name: 'size',
      description: '',
      type: { required: true, name: 'enum', raw: '"small" | "large"', value: ['small', 'large'] },
      table: {
        type: { summary: '"small" | "large"' },
        jsDocTags: undefined,
        defaultValue: undefined,
      },
    });
  });

  describe('defaultValue', () => {
    it('should support short object', () => {
      const defaultValue = extractDefaultValue("{ foo: 'foo', bar: 'bar' }");

      const expectedSummary = "{ foo: 'foo', bar: 'bar' }";

      expect(defaultValue?.summary?.replace(/\s/g, '')).toBe(expectedSummary.replace(/\s/g, ''));
      expect(defaultValue?.detail).toBeUndefined();
    });

    it('should support long object', () => {
      const defaultValue = extractDefaultValue("{ foo: 'foo', bar: 'bar', another: 'another' }");

      expect(defaultValue?.summary).toBe('object');

      const expectedDetail = `{
        foo: 'foo',
        bar: 'bar',
        another: 'another'
      }`;

      expect(defaultValue?.detail?.replace(/\s/g, '')).toBe(expectedDetail.replace(/\s/g, ''));
    });

    it('should not have deep object in summary', () => {
      const defaultValue = extractDefaultValue("{ foo: 'foo', bar: { hey: 'ho' } }");

      expect(defaultValue?.summary).toBe('object');
    });

    it('should support short function', () => {
      const defaultValue = extractDefaultValue('() => {}');

      expect(defaultValue?.summary).toBe('() => {}');
      expect(defaultValue?.detail).toBeUndefined();
    });

    it('should support long function', () => {
      const defaultValue = extractDefaultValue(
        '(foo, bar) => {\n  const concat = foo + bar;\n  const append = concat + " hey!";\n  \n  return append;\n}'
      );

      expect(defaultValue?.summary).toBe('func');

      const expectedDetail = `(foo, bar) => {
        const concat = foo + bar;
        const append = concat + ' hey!';
        return append
      }`;

      expect(defaultValue?.detail?.replace(/\s/g, '')).toBe(expectedDetail.replace(/\s/g, ''));
    });

    it('should use the name of function when available and indicate that args are present', () => {
      const defaultValue = extractDefaultValue('function concat(a, b) {\n  return a + b;\n}');

      expect(defaultValue?.summary).toBe('concat( ... )');

      const expectedDetail = `function concat(a, b) {
        return a + b
      }`;

      expect(defaultValue?.detail?.replace(/\s/g, '')).toBe(expectedDetail.replace(/\s/g, ''));
    });

    it('should use the name of function when available', () => {
      const defaultValue = extractDefaultValue('function hello() {\n  return "hello";\n}');

      expect(defaultValue?.summary).toBe('hello()');

      const expectedDetail = `function hello() {
        return 'hello'
      }`;

      expect(defaultValue?.detail?.replace(/\s/g, '')).toBe(expectedDetail.replace(/\s/g, ''));
    });

    it('should support short element', () => {
      const defaultValue = extractDefaultValue('<div>Hey!</div>');

      expect(defaultValue?.summary).toBe('<div>Hey!</div>');
      expect(defaultValue?.detail).toBeUndefined();
    });

    it('should support long element', () => {
      const defaultValue = extractDefaultValue(
        '<div>Hey! Hey! Hey!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!</div>'
      );

      expect(defaultValue?.summary).toBe('element');
      expect(defaultValue?.detail).toBe(
        '<div>Hey! Hey! Hey!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!</div>'
      );
    });

    it('should support element with props', () => {
      const defaultValue = extractDefaultValue('<Component className="toto" />');

      expect(defaultValue?.summary).toBe('<Component />');
      expect(defaultValue?.detail).toBe('<Component className="toto" />');
    });

    it("should use the name of the React component when it's available", () => {
      const defaultValue = extractDefaultValue(
        'function InlinedFunctionalComponent() {\n  return <div>Inlined FunctionalComponent!</div>;\n}'
      );

      expect(defaultValue?.summary).toBe('<InlinedFunctionalComponent />');

      const expectedDetail = `function InlinedFunctionalComponent() {
        return <div>Inlined FunctionalComponent!</div>;
      }`;

      expect(defaultValue?.detail?.replace(/\s/g, '')).toBe(expectedDetail.replace(/\s/g, ''));
    });

    it('should not use the name of an HTML element', () => {
      const defaultValue = extractDefaultValue('<div>Hey!</div>');

      expect(defaultValue?.summary).not.toBe('<div />');
    });

    it('should support short array', () => {
      const defaultValue = extractDefaultValue('[1]');

      expect(defaultValue?.summary).toBe('[1]');
      expect(defaultValue?.detail).toBeUndefined();
    });

    it('should support long array', () => {
      const defaultValue = extractDefaultValue(
        '[\n  {\n    thing: {\n      id: 2,\n      func: () => {},\n      arr: [],\n    },\n  },\n]'
      );

      expect(defaultValue?.summary).toBe('array');

      const expectedDetail = `[{
          thing: {
            id: 2,
            func: () => {
            },
            arr: []
          }
        }]`;

      expect(defaultValue?.detail?.replace(/\s/g, '')).toBe(expectedDetail.replace(/\s/g, ''));
    });

    it('should not have deep array in summary', () => {
      const defaultValue = extractDefaultValue('[[[1]]]');

      expect(defaultValue?.summary).toBe('array');
    });
  });
});
