import { Channel } from '@aussieljk/forkbook/internal/channels';

import { dedent } from 'ts-dedent';

import { UniversalStore } from './index.ts';
import type { BaseEvent, StoreOptions } from './types.ts';

/** The spy factory of a test library, such as `vi` from Vitest or `@aussieljk/forkbook/test`. */
type TestUtils = { fn: (implementation: (...args: never[]) => unknown) => unknown };

/** A method that `TestUtils.fn` has wrapped: it records the result of each call. */
type SpiedMethod = { mock?: { results: { value: unknown }[] } };

/**
 * A mock universal store that can be used when testing code that relies on a universal store. It
 * functions exactly like a normal universal store, with a few exceptions:
 *
 * - It is fully isolated, meaning that it doesn't interact with any channel, and it is always a
 *   leader.
 *
 * If the second testUtils argument is provided, all the public methods are spied on, so they can be
 * asserted.
 *
 * When a mock store is re-used across tests (eg. in stories), you manually need to reset the state
 * after each test.
 *
 * @example
 *
 * ```ts
 * import * as testUtils from '@aussieljk/forkbook/test'; // in stories
 * import { vi as testUtils } from 'vitest'; // ... or in Vitest tests
 *
 * const initialState = { ... };
 * const store = new MockUniversalStore({ initialState }, testUtils);
 *
 * export default {
 *   title: 'My story',
 *   beforeEach: () => {
 *     return () => {
 *       store.setState(initialState);
 *     };
 *   }
 * }
 * ```
 */
export class MockUniversalStore<
  State,
  CustomEvent extends BaseEvent = BaseEvent,
> extends UniversalStore<State, CustomEvent> {
  private testUtils?: TestUtils;

  public constructor(options: StoreOptions<State>, testUtils?: TestUtils) {
    UniversalStore.isInternalConstructing = true;
    super(
      { ...options, leader: true },
      { channel: new Channel({}), environment: UniversalStore.Environment.MOCK }
    );
    UniversalStore.isInternalConstructing = false;

    if (typeof testUtils?.fn !== 'function') {
      return;
    }

    this.testUtils = testUtils;
    // Each spy calls the method it wraps, so it keeps the method's type.
    this.getState = testUtils.fn(this.getState) as this['getState'];
    this.setState = testUtils.fn(this.setState) as this['setState'];
    this.subscribe = testUtils.fn(this.subscribe) as this['subscribe'];
    this.onStateChange = testUtils.fn(this.onStateChange) as this['onStateChange'];
    this.send = testUtils.fn(this.send) as this['send'];
  }

  /** Create a mock universal store. This is just an alias for the constructor */
  // `State = any`: as in `UniversalStore.create`, a store made without a state type takes any state.
  static create<State = any, CustomEvent extends BaseEvent = BaseEvent>(
    options: StoreOptions<State>,
    testUtils?: TestUtils
  ): MockUniversalStore<State, CustomEvent> {
    return new MockUniversalStore(options, testUtils);
  }

  public unsubscribeAll() {
    if (!this.testUtils) {
      // eslint-disable-next-line local-rules/no-uncategorized-errors
      throw new Error(
        dedent`Cannot call unsubscribeAll on a store that does not have testUtils.
        Please provide testUtils as the second argument when creating the store.`
      );
    }
    // unsubscribe all listeners by calling the unsubscribe methods returned from the calls
    const callReturnedUnsubscribeFn = (result: { value: unknown }) => {
      try {
        (result.value as () => void)();
      } catch (e) {
        // ignore
      }
    };
    // With testUtils, the constructor wrapped both methods in spies.
    (this.subscribe as SpiedMethod).mock?.results.forEach(callReturnedUnsubscribeFn);
    (this.onStateChange as SpiedMethod).mock?.results.forEach(callReturnedUnsubscribeFn);
  }
}
