#!/usr/bin/env node
import { program } from 'commander';

import { generate } from '../scripts/generate.ts';

program
  .description('Writes the forkbook.requires file of a React Native Forkbook')
  .option(
    '-c, --config-path <path>',
    'The path to your config folder relative to your project-dir',
    './.rnforkbook'
  )
  .option('-j, --use-js', 'Use a js file for forkbook.requires')
  .option('-D, --no-doc-tools', 'Do not include doc tools in the forkbook.requires file')
  .option(
    '-w, --host <host>',
    "Host for websockets, the value 'auto' tells Forkbook to use your local ip address"
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
