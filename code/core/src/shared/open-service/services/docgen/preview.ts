import { definePreviewAddon } from '@aussieljk/forkbook/internal/csf';

import type { ServiceInstanceOf } from '@aussieljk/forkbook/open-service';

import { registerService } from '../../preview.ts';
import { docgenServiceDef } from './definition.ts';

export type DocgenService = ServiceInstanceOf<typeof docgenServiceDef>;

export default () =>
  definePreviewAddon({
    beforeAll: () => {
      if (globalThis.FEATURES?.docgenServer) {
        registerService(docgenServiceDef);
      }
    },
  });
