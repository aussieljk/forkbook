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
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT_DIRECTORY } from './utils/constants.ts';
import {
  flushOtel,
  initOtel,
  markFailed,
  otelEnabled,
  withSpan,
  withSyncSpan,
} from './utils/otel.ts';

const args = process.argv.slice(2);
const fullBuild = args.includes('--all');
const vitestArgs = args.filter((arg) => arg !== '--all');

const logDir = join(ROOT_DIRECTORY, 'node_modules', '.cache', 'verify');
mkdirSync(logDir, { recursive: true });

function step(name: string, command: string[], cwd = ROOT_DIRECTORY) {
  return withSyncSpan(`verify.${name}`, { 'verify.step': name }, (setAttributes) => {
    const result = runStep(name, command, cwd);
    setAttributes({ 'verify.ok': result.ok });
    return result;
  });
}

function runStep(name: string, command: string[], cwd: string) {
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

// One trace for each verify run, with a child span for each step.
initOtel('forkbook-verify');
const ok = await withSpan(
  'verify',
  { 'verify.mode': fullBuild ? 'all' : args.includes('--changed') ? 'changed' : 'default' },
  async (setAttributes) => {
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
      return false;
    }
    // The published dist size, to see when the package grows.
    const distKb = Number(
      spawnSync('du', ['-sk', join(ROOT_DIRECTORY, 'code/core/dist')], {
        encoding: 'utf8',
      }).stdout.split('\t')[0]
    );
    setAttributes({ 'build.dist_kb': distKb });

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

    // Only the dot reporter: the JSON reporter added about 45 s to a full run, for the same memory.
    const tests = step('tests', [
      'bun',
      'x',
      'vitest',
      'run',
      '--reporter=dot',
      ...(otelEnabled ? ['--reporter=./scripts/vitest-otel-reporter.ts'] : []),
      ...vitestArgs,
    ]);

    // The totals, and each failed test with the first line of its error.
    const lines = tests.output.split('\n');
    for (const [index, line] of lines.entries()) {
      if (/^\s*(Test Files|Tests)\s/.test(line)) {
        console.log(line.trim());
      }
      if (/^\s*FAIL\s/.test(line)) {
        const error = lines
          .slice(index + 1)
          .find((next) => next.trim() && !/^\s*FAIL\s/.test(next));
        console.log(`\n${line.trim()}\n  ${error?.trim() ?? ''}`);
      }
    }
    if (!lines.some((line) => /^\s*Tests\s/.test(line))) {
      // Vitest did not get to the tests, for example when it could not start.
      console.log(lines.slice(-30).join('\n'));
    }

    const totals = /Tests\s+(?:(\d+) failed \| )?(\d+) passed/.exec(tests.output);
    setAttributes({
      'verify.tests.failed': Number(totals?.[1] ?? 0),
      'verify.tests.passed': Number(totals?.[2] ?? 0),
    });
    if (!(typecheck.ok && tests.ok)) {
      markFailed('verify failed');
    }
    return typecheck.ok && tests.ok;
  }
);
await flushOtel();
process.exit(ok ? 0 : 1);
