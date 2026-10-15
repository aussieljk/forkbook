export * from './root.tsx';

export { UniversalStore as internal_UniversalStore } from '../shared/universal-store/index.ts';
export { useUniversalStore as internal_useUniversalStore } from '../shared/universal-store/use-universal-store-manager.ts';
export { MockUniversalStore as experimental_MockUniversalStore } from '../shared/universal-store/mock.ts';

export {
  getStatusStoreByTypeId as experimental_getStatusStore,
  useStatusStore as experimental_useStatusStore,
  fullStatusStore as internal_fullStatusStore,
  universalStatusStore as internal_universalStatusStore,
} from './stores/status.ts';

export {
  getTestProviderStoreById as experimental_getTestProviderStore,
  useTestProviderStore as experimental_useTestProviderStore,
  fullTestProviderStore as internal_fullTestProviderStore,
  universalTestProviderStore as internal_universalTestProviderStore,
} from './stores/test-provider.ts';

export { Tag } from '../shared/constants/tags.ts';

/** OPEN SERVICE API (manager relay hub + React hooks; types on `@aussieljk/forkbook/open-service`) */
export {
  getService,
  registerService,
  useServiceCommand,
  useServiceQuery,
} from '../shared/open-service/manager.ts';
