#!/usr/bin/env node
export {};

const { isNodeVersionSupported } = await import('@aussieljk/forkbook/internal/common');

if (!isNodeVersionSupported(process.versions.node)) {
  const { MIN_SUPPORTED_NODE_DESCRIPTION } = await import('@aussieljk/forkbook/internal/common');
  const { logger } = await import('@aussieljk/forkbook/internal/node-logger');
  logger.error(
    `To run Forkbook, you need Node.js version ${MIN_SUPPORTED_NODE_DESCRIPTION}.\n` +
      `You are currently running Node.js ${process.version}.`
  );
  logger.outro('');
  process.exit(1);
}

await import('./run.ts');
