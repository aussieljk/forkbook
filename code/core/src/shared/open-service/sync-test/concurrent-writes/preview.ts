import { registerService } from '@aussieljk/forkbook/preview-api';

import { concurrentWritesSyncServiceDef } from './definition.ts';

export const concurrentWritesSyncService = registerService(concurrentWritesSyncServiceDef);
