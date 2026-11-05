import { describe, expect, it, vi } from 'vitest';

import { logger } from '@aussieljk/forkbook/internal/client-logger';

import { type InferArgTypesContext, inferArgTypes } from './inferArgTypes.ts';

vi.mock('@aussieljk/forkbook/internal/client-logger');

/** A context with only the fields that a test sets. */
const context = (fields: object) => fields as InferArgTypesContext;

describe('inferArgTypes', () => {
  it('infers scalar types', () => {
    expect(
      inferArgTypes(
        context({
          initialArgs: {
            a: true,
            b: 'string',
            c: 1,
            d: () => {},
            e: Symbol('foo'),
          },
        })
      )
    ).toEqual({
      a: { name: 'a', type: { name: 'boolean' } },
      b: { name: 'b', type: { name: 'string' } },
      c: { name: 'c', type: { name: 'number' } },
      d: { name: 'd', type: { name: 'function' } },
      e: { name: 'e', type: { name: 'symbol' } },
    });
  });

  it('infers array types', () => {
    expect(
      inferArgTypes(
        context({
          initialArgs: {
            a: [1, 2, 3],
            b: ['a', 'b', 'c'],
            c: [],
          },
        })
      )
    ).toEqual({
      a: { name: 'a', type: { name: 'array', value: { name: 'number' } } },
      b: { name: 'b', type: { name: 'array', value: { name: 'string' } } },
      c: { name: 'c', type: { name: 'array', value: { name: 'other', value: 'unknown' } } },
    });
  });

  it('infers object types', () => {
    expect(
      inferArgTypes(
        context({
          initialArgs: {
            a: {
              x: 'string',
              y: 1,
            },
          },
        })
      )
    ).toEqual({
      a: {
        name: 'a',
        type: { name: 'object', value: { x: { name: 'string' }, y: { name: 'number' } } },
      },
    });
  });

  it('infers nested types', () => {
    expect(
      inferArgTypes(
        context({
          initialArgs: {
            a: [
              {
                x: 'string',
              },
            ],
          },
        })
      )
    ).toEqual({
      a: {
        name: 'a',
        type: { name: 'array', value: { name: 'object', value: { x: { name: 'string' } } } },
      },
    });
  });

  it('avoid cycles', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.foo = cyclic;

    vi.mocked(logger.warn).mockClear();
    expect(
      inferArgTypes(
        context({
          initialArgs: {
            a: cyclic,
          },
        })
      )
    ).toEqual({
      a: {
        name: 'a',
        type: { name: 'object', value: { foo: { name: 'other', value: 'cyclic object' } } },
      },
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('ensures names', () => {
    vi.mocked(logger.warn).mockClear();
    expect(
      inferArgTypes(
        context({
          initialArgs: {
            a: 1,
          },
          argTypes: {
            a: {
              control: {
                type: 'range',
              },
            },
          },
        })
      )
    ).toEqual({
      a: {
        name: 'a',
        type: { name: 'number' },
        control: { type: 'range' },
      },
    });
  });

  it('ensures names even with no arg', () => {
    vi.mocked(logger.warn).mockClear();
    expect(
      inferArgTypes(
        context({
          argTypes: {
            a: {
              type: {
                name: 'string',
              },
            },
          },
        })
      )
    ).toEqual({
      a: {
        name: 'a',
        type: { name: 'string' },
      },
    });
  });

  it('does not infer types for args that already have an argType', () => {
    expect(
      inferArgTypes(
        context({
          initialArgs: {
            size: 'large',
          },
          argTypes: {
            size: {
              type: {
                name: 'enum',
                value: ['small', 'medium', 'large'],
              },
            },
          },
        })
      )
    ).toEqual({
      size: {
        name: 'size',
        type: { name: 'enum', value: ['small', 'medium', 'large'] },
      },
    });
  });
});
