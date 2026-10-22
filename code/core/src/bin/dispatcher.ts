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

  // Agents that learned `storybook ai setup` from Forkbook 10 docs keep calling it, and the generic
  // "Did you mean add?" fallback would steer them to the wrong command. Remove in Forkbook 12.
  if (args[0] === 'ai') {
    logger.error(
      dedent`The \`storybook ai\` command was removed in Forkbook 11.
      Run \`npx forkbook skills setup\` instead of \`storybook ai setup\`, and \`npx forkbook tools\` for the other \`ai\` subcommands.`
    );
    process.exit(1);
  }

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
      : 'dist/cli-commands/bin/index.js';

  if (args[0] === 'init') {
    // The create CLI takes its options without the `init` command name.
    process.argv.splice(2, 1);
  }

  await import(pathToFileURL(join(resolvePackageDir('@aussieljk/forkbook'), bin)).href);
}

run();
