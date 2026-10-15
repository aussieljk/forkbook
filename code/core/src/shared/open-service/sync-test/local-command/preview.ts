import { registerService } from '@aussieljk/forkbook/preview-api';

import { localCommandSyncServiceDef } from './definition.ts';

export const localCommandSyncService = registerService(localCommandSyncServiceDef);
