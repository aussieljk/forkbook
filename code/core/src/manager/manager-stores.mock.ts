import { experimental_MockUniversalStore, internal_useUniversalStore } from 'storybook/manager-api';
import * as testUtils from 'storybook/test';

import {
  type StatusStoreEvent,
  type StatusesByStoryIdAndTypeId,
  createStatusStore,
} from '../shared/status-store/index.ts';
import { UNIVERSAL_STATUS_STORE_OPTIONS } from '../shared/status-store/index.ts';
import type {
  TestProviderStateByProviderId,
  TestProviderStoreEvent,
} from '../shared/test-provider-store/index.ts';
import { UNIVERSAL_TEST_PROVIDER_STORE_OPTIONS } from '../shared/test-provider-store/index.ts';
import { createTestProviderStore } from '../shared/test-provider-store/index.ts';
import type { UniversalStore } from '../shared/universal-store/index.ts';

export const {
  fullStatusStore: internal_fullStatusStore,
  getStatusStoreByTypeId: experimental_getStatusStore,
  useStatusStore: experimental_useStatusStore,
} = createStatusStore({
  universalStatusStore: new experimental_MockUniversalStore(
    UNIVERSAL_STATUS_STORE_OPTIONS,
    testUtils
  ) as unknown as UniversalStore<StatusesByStoryIdAndTypeId, StatusStoreEvent>,
  useUniversalStore: internal_useUniversalStore,
  environment: 'manager',
});

export const {
  fullTestProviderStore: internal_fullTestProviderStore,
  getTestProviderStoreById: experimental_getTestProviderStore,
  useTestProviderStore: experimental_useTestProviderStore,
} = createTestProviderStore({
  universalTestProviderStore: new experimental_MockUniversalStore(
    UNIVERSAL_TEST_PROVIDER_STORE_OPTIONS,
    testUtils
  ) as unknown as UniversalStore<TestProviderStateByProviderId, TestProviderStoreEvent>,
  useUniversalStore: internal_useUniversalStore,
});
