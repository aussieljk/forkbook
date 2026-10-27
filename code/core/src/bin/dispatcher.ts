#!/usr/bin/env node
import Module from 'node:module';
import { pathToFileURL } from 'node:url';

import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { join } from 'pathe';
import { dedent } from 'ts-dedent';

import { MIN_SUPPORTED_NODE_DESCRIPTION, isNodeVersionSupported } from '../common/node-version.ts';
import { resolvePackageDir } from '../shared/utils/module.ts';

/**
 * Dispatches Forkbook CLI commands to the appropriate handler.
 *
 * This function serves as the main entry point for Forkbook CLI operations.
 *
 * - Core Forkbook commands (dev, build, index, tools, skills) go to dist/bin/core.js
 * - Init goes to the create CLI (dist/create/bin/index.js)
 * - rn-stories goes to the React Native story list writer (dist/react-native/bin/get-stories.js)
 * - Other CLI commands (add, remove, migrate, pages) go to the CLI commands (dist/cli-commands/bin/index.js)
 */
if (!isNodeVersionSupported(process.versions.node)) {
  logger.error(
    dedent`To run Forkbook, you need Node.js version ${MIN_SUPPORTED_NODE_DESCRIPTION}.
    You are currently running Node.js ${process.version}. Please upgrade your Node.js installation.`
  );
  process.exit(1);
}

async function run() {
  Module.enableCompileCache();

  const args = process.argv.slice(2);

  if (args[0] === 'tools' && !args.includes('--no-attach')) {
    process.env.FORKBOOK_ATTACHED_TOOLS = 'true';
  }

  // `init --pages` writes page stories. The CLI commands have it as `pages`.
  if (args[0] === 'init' && args.includes('--pages')) {
    process.argv.splice(
      2,
      process.argv.length,
      'pages',
      ...args.slice(1).filter((a) => a !== '--pages')
    );
    args[0] = 'pages';
  }

  const bin = ['dev', 'build', 'index', 'tools', 'skills'].includes(args[0])
    ? 'dist/bin/core.js'
    : args[0] === 'init'
      ? 'dist/create/bin/index.js'
      : args[0] === 'rn-stories'
        ? 'dist/react-native/bin/get-stories.js'
        : 'dist/cli-commands/bin/index.js';

  if (args[0] === 'init' || args[0] === 'rn-stories') {
    // These CLIs take their options without the command name.
    process.argv.splice(2, 1);
  }

  await import(pathToFileURL(join(resolvePackageDir('@aussieljk/forkbook'), bin)).href);
}

run();
