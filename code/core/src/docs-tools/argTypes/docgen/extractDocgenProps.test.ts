import { describe, expect, it } from 'vitest';

import type { Component } from '../types.ts';
import { extractComponentProps } from './extractDocgenProps.ts';

const DOCGEN_SECTION = 'props';
const PROP_NAME = 'propName';

function createStringType(): any {
  return { type: { name: 'string' } };
}

function createFuncType(): any {
  return { type: { name: '() => void' } };
}

function createComponent(docgenInfo: Record<string, any>): Component {
  const component = () => {};
  component.__docgenInfo = {
    [DOCGEN_SECTION]: {
      [PROP_NAME]: {
        required: false,
        ...docgenInfo,
      },
    },
  };

  return component;
}

describe('extractComponentProps', () => {
  it('should map defaults docgen info properly', () => {
    const component = createComponent({
      ...createStringType(),
      description: 'Hey! Hey!',
      defaultValue: {
        value: "'Default'",
        computed: false,
      },
    });

    const { propDef } = extractComponentProps(component, DOCGEN_SECTION)[0];

    expect(propDef.name).toBe(PROP_NAME);
    expect(propDef.type?.summary).toBe('string');
    expect(propDef.description).toBe('Hey! Hey!');
    expect(propDef.required).toBe(false);
    expect(propDef.defaultValue?.summary).toBe("'Default'");
  });

  it('should remove JSDoc tags from the description', () => {
    const component = createComponent({
      ...createStringType(),
      description: 'Hey!\n@param event\nreturns {string}',
    });

    const { propDef } = extractComponentProps(component, DOCGEN_SECTION)[0];

    expect(propDef.description).toBe('Hey!');
  });

  it('should not remove newline characters of multilines description without JSDoc tags', () => {
    const component = createComponent({
      ...createStringType(),
      description: 'onClick description\nis a\nmulti-lines\ndescription',
    });

    const { propDef } = extractComponentProps(component, DOCGEN_SECTION)[0];

    expect(propDef.description).toBe('onClick description\nis a\nmulti-lines\ndescription');
  });

  it('should not remove newline characters of multilines description with JSDoc tags', () => {
    const component = createComponent({
      ...createFuncType(),
      description: 'onClick description\nis a\nmulti-lines\ndescription\n@param event',
    });

    const { propDef } = extractComponentProps(component, DOCGEN_SECTION)[0];

    expect(propDef.description).toBe('onClick description\nis a\nmulti-lines\ndescription');
  });

  it('should not remove markdown from description without JSDoc tags', () => {
    const component = createComponent({
      ...createStringType(),
      description: 'onClick *emphasis*, **strong**, `formatted` description.',
    });

    const { propDef } = extractComponentProps(component, DOCGEN_SECTION)[0];

    expect(propDef.description).toBe('onClick *emphasis*, **strong**, `formatted` description.');
  });

  it('should not remove markdown from description with JSDoc tags', () => {
    const component = createComponent({
      ...createFuncType(),
      description: 'onClick *emphasis*, **strong**, `formatted` description.\n@param event',
    });

    const { propDef } = extractComponentProps(component, DOCGEN_SECTION)[0];

    expect(propDef.description).toBe('onClick *emphasis*, **strong**, `formatted` description.');
  });

  it('should return null when the property is marked with @ignore', () => {
    const component = createComponent({
      ...createStringType(),
      description: 'onClick description\n@ignore',
    });

    expect(extractComponentProps(component, DOCGEN_SECTION).length).toBe(0);
  });

  it('should provide raw @param tags', () => {
    const component = createComponent({
      ...createFuncType(),
      description:
        'onClick description\n@param {SyntheticEvent} event - Original event.\n@param {string} value',
    });

    const { propDef } = extractComponentProps(component, DOCGEN_SECTION)[0];

    expect(propDef.description).toBe('onClick description');
    expect(propDef.jsDocTags).toBeDefined();
    expect(propDef.jsDocTags?.params).toBeDefined();
    expect(propDef.jsDocTags?.params?.[0].name).toBe('event');
    expect(propDef.jsDocTags?.params?.[0].description).toBe('Original event.');
    expect(propDef.jsDocTags?.params?.[1].name).toBe('value');
    expect(propDef.jsDocTags?.params?.[1].description).toBeNull();
  });

  it("should not return 'null' default value", () => {
    const component = createComponent({
      ...createStringType(),
      defaultValue: { value: 'null' },
    });

    const { propDef } = extractComponentProps(component, DOCGEN_SECTION)[0];

    expect(propDef.defaultValue).toBeNull();
  });

  it("should not return 'undefined' default value", () => {
    const component = createComponent({
      ...createStringType(),
      defaultValue: { value: 'undefined' },
    });

    const { propDef } = extractComponentProps(component, DOCGEN_SECTION)[0];

    expect(propDef.defaultValue).toBeNull();
  });
});
