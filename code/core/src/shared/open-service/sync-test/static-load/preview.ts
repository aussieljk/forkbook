import { registerService } from '@aussieljk/forkbook/preview-api';

import { staticLoadSyncServiceDef } from './definition.ts';

export const staticLoadSyncService = registerService(staticLoadSyncServiceDef);
