import { registerService } from '@aussieljk/forkbook/preview-api';

import { remoteCommandSyncServiceDef } from './definition.ts';

export const remoteCommandSyncService = registerService(remoteCommandSyncServiceDef);
