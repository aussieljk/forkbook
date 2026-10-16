/**
 * Build, type check and test, then print a short summary. Full logs go to
 * node_modules/.cache/verify.
 *
 *   bun run verify                  build what changed, typecheck, all tests
 *   bun run verify --all            build every package first
 *   bun run verify --changed        only the tests that the changed files touch
 *   bun run verify --project core   any other argument goes to vitest
 */
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT_DIRECTORY } from './utils/constants.ts';
import { flushOtel, initOtel, markFailed, otelEnabled, withSpan } from './utils/otel.ts';
import { treeIfClean, VERIFIED_TREES } from './utils/verified-trees.ts';

const args = process.argv.slice(2);
const fullBuild = args.includes('--all');
const vitestArgs = args.filter((arg) => arg !== '--all');
const changedOnly = args.some((arg) => arg.startsWith('--changed'));
// Only a full run with a clean tree proves the tree. merge-agent then skips verify for it.
const tree = vitestArgs.length === 0 ? treeIfClean() : undefined;

const logDir = join(ROOT_DIRECTORY, 'node_modules', '.cache', 'verify');
mkdirSync(logDir, { recursive: true });

function step(name: string, command: string[], cwd = ROOT_DIRECTORY) {
  return withSpan(`verify.${name}`, { 'verify.step': name }, async (setAttributes) => {
    const result = await runStep(name, command, cwd);
    setAttributes({ 'verify.ok': result.ok });
    return result;
  });
}

async function runStep(name: string, command: string[], cwd: string) {
  const start = Date.now();
  const child = spawn(command[0], command.slice(1), {
    cwd,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const status = await new Promise<number | null>((resolve) => child.on('close', resolve));
  const logFile = join(logDir, `${name}.log`);
  writeFileSync(logFile, output);
  const seconds = Math.round((Date.now() - start) / 1000);
  const ok = status === 0;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(9)} ${String(seconds).padStart(4)} s   ${logFile}`
  );
  return { ok, output };
}

// One trace for each verify run, with a child span for each step.
initOtel('forkbook-verify');
const ok = await withSpan(
  'verify',
  { 'verify.mode': fullBuild ? 'all' : changedOnly ? 'changed' : 'default' },
  async (setAttributes) => {
    const build = await step(
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

    // The type check and the tests do not depend on each other, so they run at the same time.
    const typecheckRun = step('typecheck', [
      'bun',
      'check',
      '-b',
      '-p',
      'code/tsconfig.packages.json',
      '--no-pretty',
    ]);
    // Only the dot reporter: the JSON reporter added about 45 s to a full run, for the same memory.
    const testsRun = step('tests', [
      'bun',
      'x',
      'vitest',
      'run',
      '--reporter=dot',
      ...(otelEnabled ? ['--reporter=./scripts/vitest-otel-reporter.ts'] : []),
      ...vitestArgs,
    ]);
    const [typecheck, tests] = await Promise.all([typecheckRun, testsRun]);
    if (!typecheck.ok) {
      console.log(
        typecheck.output
          .split('\n')
          .filter((line) => /error TS\d+/.test(line))
          .slice(0, 30)
          .join('\n')
      );
    }

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
    } else if (tree) {
      appendFileSync(VERIFIED_TREES, `${tree}\n`);
    }
    return typecheck.ok && tests.ok;
  }
);
await flushOtel();
process.exit(ok ? 0 : 1);
