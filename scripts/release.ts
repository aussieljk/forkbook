#!/usr/bin/env bun
/**
 * Publishes @aussieljk/forkbook (code/core) to npm and pushes the version commit.
 *
 *   bun scripts/release.ts
 *   bun scripts/release.ts --if-changed   publish only if this push changed code/core
 *
 * It runs the same way on the Mac mini and in the Release workflow.
 *
 *   1. With --if-changed, stop if the push did not change a file in code/core.
 *   2. Stop if there are uncommitted changes.
 *   3. In CI, make sure npm can publish with OIDC, and set a git identity.
 *   4. If npm already has the current version, increase the prerelease number
 *      (0.0.1-3 to 0.0.1-4). If not (you set a new version by hand), publish it as it is.
 *   5. Build (this also writes the version into code/core/src/common/versions.ts) and publish
 *      with the `latest` tag. npm needs a tag for a prerelease version.
 *   6. Commit the version files, tag the commit and push.
 *
 * There is no npm token. In CI, the `id-token: write` permission makes an OIDC token that npm
 * accepts, and npm adds provenance. On the Mac mini it uses your `npm login` session, without
 * provenance (provenance works only in CI).
 *
 * The push uses GITHUB_TOKEN. GitHub does not start new workflow runs for those pushes. This is
 * important: the release commit changes code/core/package.json, so a push that started a
 * workflow would release again, forever.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CI = !!process.env.CI;

/** Trusted publishing came in npm 11.5.1. An older npm uses token auth. */
const MIN_NPM = [11, 5, 1];

/** A change in this folder changes the tarball, so it gets a release. */
const PUBLISHED_PATH = 'code/core/';

const PKG_PATH = join(ROOT, PUBLISHED_PATH, 'package.json');

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function step(message: string) {
  console.log(`\n\x1b[1m▸ ${message}\x1b[0m`);
}

/** Runs a command and shows its output. A non-zero exit stops the script. */
function run(cmd: string[], cwd = ROOT) {
  console.log(`$ ${cmd.join(' ')}`);
  const { status } = spawnSync(cmd[0], cmd.slice(1), { cwd, stdio: 'inherit' });
  if (status !== 0) fail(`${cmd.join(' ')} failed (exit ${status})`);
}

/** Runs a command and gives its stdout, or undefined if it fails. */
function capture(cmd: string[]): string | undefined {
  const { status, stdout } = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8' });
  return status === 0 ? stdout.trim() : undefined;
}

/** Markdown for the GitHub Actions job summary. Does nothing locally. */
function summary(markdown: string) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (path) appendFileSync(path, `${markdown}\n`);
}

const readPkg = () => JSON.parse(readFileSync(PKG_PATH, 'utf8'));

/** 0.0.1-3 gives 0.0.1-4. Forkbook uses only this version scheme. */
function nextVersion(version: string): string {
  const match = /^(\d+\.\d+\.\d+)-(\d+)$/.exec(version);
  if (!match)
    fail(`${version} is not <major>.<minor>.<patch>-<number>. Set the next version by hand.`);
  return `${match[1]}-${Number(match[2]) + 1}`;
}

/**
 * The files that this push changed, or undefined if we cannot tell (a manual run, a first push,
 * or a clone without the previous commit). Undefined means "it changed": a missed release is
 * worse than a spare version number.
 */
function pushedFiles(): string[] | undefined {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return undefined;
  let before: string | undefined;
  try {
    before = JSON.parse(readFileSync(eventPath, 'utf8')).before;
  } catch {
    return undefined;
  }
  // All zeros is the first push to a branch, which has nothing to compare with.
  if (!before || /^0+$/.test(before)) return undefined;
  return capture(['git', 'diff', '--name-only', `${before}..HEAD`])
    ?.split('\n')
    .filter(Boolean);
}

if (process.argv.includes('--if-changed')) {
  const files = pushedFiles();
  if (files && !files.some((file) => file.startsWith(PUBLISHED_PATH))) {
    step(`No change in ${PUBLISHED_PATH} in this push. No release.`);
    summary(
      '### 📦 No release\n\nNothing in code/core changed, so the npm version stays the same.'
    );
    process.exit(0);
  }
}

step('Checking the working tree');
const dirty = capture(['git', 'status', '--porcelain']);
if (dirty) fail(`uncommitted changes. Commit them first:\n${dirty}`);

if (CI) {
  if (process.env.NODE_AUTH_TOKEN) {
    fail('NODE_AUTH_TOKEN is set. npm would use token auth, not trusted publishing.');
  }
  const npm = (capture(['npm', '--version']) ?? '0.0.0').split('.').map(Number);
  // The first part that is different decides the order.
  const i = MIN_NPM.findIndex((part, index) => npm[index] !== part);
  if (i !== -1 && (npm[i] ?? 0) < MIN_NPM[i]) {
    step(`npm ${npm.join('.')} is older than ${MIN_NPM.join('.')}. Upgrading.`);
    run(['npm', 'install', '-g', 'npm@latest']);
  }
  run(['git', 'config', 'user.name', 'github-actions[bot]']);
  run(['git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
}

const { name, version: current } = readPkg();
const bumped = !!capture(['npm', 'view', `${name}@${current}`, 'version']);

if (bumped) {
  // A run that published but did not push its version commit leaves npm ahead of package.json.
  let next = nextVersion(current);
  while (capture(['npm', 'view', `${name}@${next}`, 'version'])) next = nextVersion(next);
  step(`${name}@${current} is on npm. The next version is ${next}.`);
  const pkg = readPkg();
  pkg.version = next;
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  // bun.lock records the workspace version. Without this, the next
  // `bun install --frozen-lockfile` fails.
  run(['bun', 'install', '--lockfile-only']);
}

const released = readPkg().version as string;

step(`Publishing ${name}@${released}`);
// The build writes the new version into code/core/src/common/versions.ts and the dist.
run(['bun', 'run', 'build']);
run(
  [
    'npm',
    'publish',
    '--access',
    'public',
    '--tag',
    'latest',
    ...(CI ? [] : ['--provenance=false']),
  ],
  join(ROOT, PUBLISHED_PATH)
);

if (bumped) {
  step(`Committing ${released}`);
  run(['git', 'commit', '-am', `Release ${released}`]);
}
run(['git', 'tag', `v${released}`]);

// HEAD:<branch>, so this works from the CI checkout and from a local branch.
const branch = process.env.GITHUB_REF_NAME ?? capture(['git', 'rev-parse', '--abbrev-ref', 'HEAD']);
run(['git', 'push', 'origin', `HEAD:${branch}`, `v${released}`]);

summary(
  `### 📦 Published \`${name}@${released}\`\n\nhttps://www.npmjs.com/package/${name}/v/${released}`
);
console.log(`\n✓ published ${name}@${released}`);
