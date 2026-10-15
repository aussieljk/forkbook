import '@aussieljk/forkbook/test';

import type { LiveRegionMatcherOptions } from '../../../core/src/shared/utils/toHaveLiveRegion';

declare module '@aussieljk/forkbook/test' {
  interface Assertion<T> {
    toHaveLiveRegion(options: LiveRegionMatcherOptions): Promise<void>;
  }
}
