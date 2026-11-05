import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PreparedStory, StrictInputType } from '@aussieljk/forkbook/internal/types';

import { ArgsStore } from './ArgsStore.ts';

vi.mock('@aussieljk/forkbook/internal/client-logger');

// The store does not read the `name` of an arg type.
const stringType = { type: { name: 'string' } } as StrictInputType;
const booleanType = { type: { name: 'boolean' } } as StrictInputType;

/** A story with only the fields that the args store reads. */
const makeStory = (fields: object) => fields as PreparedStory;

describe('ArgsStore', () => {
  describe('setInitial / get', () => {
    it('returns in a straightforward way', () => {
      const store = new ArgsStore();
      store.setInitial(makeStory({ id: 'id', initialArgs: { foo: 'bar' } }));
      expect(store.get('id')).toEqual({ foo: 'bar' });
    });

    it('throws if you try to get non-existent', () => {
      const store = new ArgsStore();
      expect(() => store.get('id')).toThrow(/No args known/);
    });

    describe('on second call for same story', () => {
      describe('if initialArgs are unchanged', () => {
        it('does nothing if the args are untouched', () => {
          const store = new ArgsStore();

          const previousStory = makeStory({
            id: 'id',
            initialArgs: { a: '1', b: '1' },
            argTypes: { a: stringType, b: stringType },
          });
          store.setInitial(previousStory);

          const story = makeStory({
            id: 'id',
            initialArgs: { a: '1', b: '1' },
            argTypes: { a: stringType, b: stringType },
          });

          store.setInitial(story);
          expect(store.get(story.id)).toEqual({ a: '1', b: '1' });
        });

        it('retains any arg changes', () => {
          const store = new ArgsStore();

          const previousStory = makeStory({
            id: 'id',
            initialArgs: { a: '1', b: false, c: 'unchanged' },
            argTypes: { a: stringType, b: booleanType, c: stringType },
          });
          store.setInitial(previousStory);

          // NOTE: I'm not sure technically you should be allowed to set d here, but
          // let's make sure we behave sensibly if you do
          store.update('id', { a: 'update', b: true, d: 'update' });

          const story = makeStory({
            id: 'id',
            initialArgs: { a: '1', b: false, c: 'unchanged' },
            argTypes: { a: stringType, b: booleanType, c: stringType },
          });

          store.setInitial(story);
          // In any case c is not retained.
          expect(store.get(story.id)).toEqual({ a: 'update', b: true, c: 'unchanged' });
        });
      });

      describe('when initialArgs change', () => {
        it('replaces old args with new if the args are untouched', () => {
          const store = new ArgsStore();

          const previousStory = makeStory({
            id: 'id',
            initialArgs: { a: '1', b: '1' },
            argTypes: { a: stringType, b: stringType },
          });
          store.setInitial(previousStory);

          const story = makeStory({
            id: 'id',
            initialArgs: { a: '1', c: '1' },
            argTypes: { a: stringType, c: stringType },
          });

          store.setInitial(story);
          expect(store.get(story.id)).toEqual({ a: '1', c: '1' });
        });

        it('applies the same delta if the args are changed', () => {
          const store = new ArgsStore();

          const previousStory = makeStory({
            id: 'id',
            initialArgs: { a: '1', b: '1' },
            argTypes: { a: stringType, b: stringType },
          });
          store.setInitial(previousStory);

          // NOTE: I'm not sure technically you should be allowed to set c here
          store.update('id', { a: 'update', c: 'update' });

          const story = makeStory({
            id: 'id',
            initialArgs: { a: '2', d: '2' },
            argTypes: { a: stringType, d: stringType },
          });

          store.setInitial(story);
          // In any case c is not retained.
          expect(store.get(story.id)).toEqual({ a: 'update', d: '2' });
        });
      });
    });
  });

  describe('update', () => {
    it('overrides on a per-key basis', () => {
      const store = new ArgsStore();

      store.setInitial(makeStory({ id: 'id', initialArgs: {} }));

      store.update('id', { foo: 'bar' });
      expect(store.get('id')).toEqual({ foo: 'bar' });

      store.update('id', { baz: 'bing' });
      expect(store.get('id')).toEqual({ foo: 'bar', baz: 'bing' });
    });

    it('does not merge objects', () => {
      const store = new ArgsStore();

      store.setInitial(makeStory({ id: 'id', initialArgs: {} }));

      store.update('id', { obj: { foo: 'bar' } });
      expect(store.get('id')).toEqual({ obj: { foo: 'bar' } });

      store.update('id', { obj: { baz: 'bing' } });
      expect(store.get('id')).toEqual({ obj: { baz: 'bing' } });
    });

    it('does not set keys to undefined, it simply unsets them', () => {
      const store = new ArgsStore();

      store.setInitial(makeStory({ id: 'id', initialArgs: { foo: 'bar' } }));

      store.update('id', { foo: undefined });
      expect('foo' in store.get('id')).toBe(false);
    });
  });

  describe('updateFromPersisted', () => {
    it('ensures the types of args are correct', () => {
      const store = new ArgsStore();

      store.setInitial(makeStory({ id: 'id', initialArgs: {} }));

      const story = makeStory({
        id: 'id',
        argTypes: { a: stringType },
      });
      store.updateFromPersisted(story, { a: 'str' });
      expect(store.get('id')).toEqual({ a: 'str' });

      store.updateFromPersisted(story, { a: 42 });
      expect(store.get('id')).toEqual({ a: '42' });
    });

    it('merges objects and sparse arrays', () => {
      const store = new ArgsStore();

      store.setInitial(
        makeStory({
          id: 'id',
          initialArgs: { a: { foo: 'bar' }, b: ['1', '2', '3'] },
        })
      );

      const story = makeStory({
        id: 'id',
        argTypes: {
          a: { type: { name: 'object', value: { name: 'string' } } },
          b: { type: { name: 'array', value: { name: 'string' } } },
        },
      });
      store.updateFromPersisted(story, { a: { baz: 'bing' } });
      expect(store.get('id')).toEqual({
        a: { foo: 'bar', baz: 'bing' },
        b: ['1', '2', '3'],
      });

      store.updateFromPersisted(story, { b: [, , '4'] });
      expect(store.get('id')).toEqual({
        a: { foo: 'bar', baz: 'bing' },
        b: ['1', '2', '4'],
      });
    });

    it('checks args are allowed options', () => {
      const store = new ArgsStore();

      store.setInitial(makeStory({ id: 'id', initialArgs: {} }));

      const story = makeStory({
        id: 'id',
        argTypes: { a: { type: { name: 'string' }, options: ['a', 'b'] } },
      });
      store.updateFromPersisted(story, { a: 'random' });
      expect(store.get('id')).toEqual({});

      store.updateFromPersisted(story, { a: 'a' });
      expect(store.get('id')).toEqual({ a: 'a' });
    });

    // Server docgen keeps `argTypes` annotation-only, so a plain `args` entry arrives here without
    // a type and would be dropped rather than applied.
    describe('with docgenServer', () => {
      afterEach(() => vi.unstubAllGlobals());

      it('types args from their initial value when the story declares no argTypes', () => {
        vi.stubGlobal('FEATURES', { docgenServer: true });
        const store = new ArgsStore();
        const story = makeStory({
          id: 'id',
          initialArgs: { a: 'Button', b: 1 },
          argTypes: {},
        });
        store.setInitial(story);

        store.updateFromPersisted(story, { a: 'Hello world', b: '42' });
        expect(store.get('id')).toEqual({ a: 'Hello world', b: 42 });
      });
    });
  });
});
