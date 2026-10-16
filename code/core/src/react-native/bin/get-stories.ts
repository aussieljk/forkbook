#!/usr/bin/env node
import { program } from 'commander';

import { generate } from '../scripts/generate.ts';

program
  .description('Generator for the storybook.requires file used in react native storybook')
  .option(
    '-c, --config-path <path>',
    'The path to your config folder relative to your project-dir',
    './.rnstorybook'
  )
  .option('-j, --use-js', 'Use a js file for storybook.requires')
  .option('-D, --no-doc-tools', 'Do not include doc tools in the storybook.requires file')
  .option(
    '-w, --host <host>',
    "Host for websockets, the value 'auto' will tell storybook to use your local ip address"
  )
  .option('-p, --port <port>', 'Port for websockets', (value) => {
    const port = parseInt(value, 10);
    if (isNaN(port)) {
      throw new Error(`Invalid port number: "${value}"`);
    }
    return port;
  });

program.parse();

await generate(program.opts());
