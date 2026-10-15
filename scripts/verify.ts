/**
 * Build, type check and test, then print a short summary. Full logs go to
 * node_modules/.cache/verify.
 *
 *   bun run verify                  build what changed, typecheck, all tests
 *   bun run verify --all            build every package first
 *   bun run verify --changed        only the tests that the changed files touch
 *   bun run verify --project core   any other argument goes to vitest
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT_DIRECTORY } from './utils/constants.ts';

const args = process.argv.slice(2);
const fullBuild = args.includes('--all');
const vitestArgs = args.filter((arg) => arg !== '--all');

const logDir = join(ROOT_DIRECTORY, 'node_modules', '.cache', 'verify');
mkdirSync(logDir, { recursive: true });

function step(name: string, command: string[], cwd = ROOT_DIRECTORY) {
  const start = Date.now();
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    maxBuffer: 512 * 1024 * 1024,
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const logFile = join(logDir, `${name}.log`);
  writeFileSync(logFile, output);
  const seconds = Math.round((Date.now() - start) / 1000);
  const ok = result.status === 0;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(9)} ${String(seconds).padStart(4)} s   ${logFile}`
  );
  return { ok, output };
}

const build = step(
  'build',
  ['bun', './build-package.ts', fullBuild ? '--all' : '--changed', '--no-watch', '--prod'],
  join(ROOT_DIRECTORY, 'scripts')
);
if (!build.ok) {
  console.log(
    build.output
      .split('\n')
      .filter((line) => /error/i.test(line))
      .slice(0, 20)
      .join('\n')
  );
  process.exit(1);
}

const typecheck = step('typecheck', [
  'bun',
  'check',
  '-b',
  '-p',
  'code/tsconfig.packages.json',
  '--no-pretty',
]);
if (!typecheck.ok) {
  console.log(
    typecheck.output
      .split('\n')
      .filter((line) => /error TS\d+/.test(line))
      .slice(0, 30)
      .join('\n')
  );
}

const reportFile = join(logDir, 'vitest.json');
const tests = step('tests', [
  'bun',
  'x',
  'vitest',
  'run',
  '--reporter=dot',
  '--reporter=json',
  `--outputFile.json=${reportFile}`,
  ...vitestArgs,
]);

type Report = {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  testResults: {
    name: string;
    message?: string;
    assertionResults: { fullName: string; status: string; failureMessages: string[] }[];
  }[];
};
try {
  const report: Report = JSON.parse(readFileSync(reportFile, 'utf8'));
  console.log(
    `\nTests: ${report.numPassedTests} passed, ${report.numFailedTests} failed, ${report.numPendingTests} skipped, ${report.numTotalTests} total`
  );
  for (const file of report.testResults) {
    const name = file.name.replace(ROOT_DIRECTORY + '/', '');
    const failed = file.assertionResults.filter((test) => test.status === 'failed');
    if (file.message && failed.length === 0) {
      console.log(`\n${name}\n  ${file.message.split('\n')[0]}`);
    }
    for (const test of failed) {
      console.log(
        `\n${name} > ${test.fullName}\n  ${(test.failureMessages[0] ?? '').split('\n')[0]}`
      );
    }
  }
} catch {
  // Vitest did not write a report, for example when it could not start.
  console.log(tests.output.split('\n').slice(-30).join('\n'));
}

process.exit(typecheck.ok && tests.ok ? 0 : 1);
