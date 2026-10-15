#!/usr/bin/env node
import {
  MIN_SUPPORTED_NODE_DESCRIPTION,
  isNodeVersionSupported,
} from '@aussieljk/forkbook/internal/common';
import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { dedent } from 'ts-dedent';

if (!isNodeVersionSupported(process.versions.node)) {
  logger.error(
    dedent`To run Forkbook, you need Node.js version ${MIN_SUPPORTED_NODE_DESCRIPTION}.
      You are currently running Node.js ${process.version}. Please upgrade your Node.js installation.`
  );
  process.exit(1);
}

import('./run.ts');
