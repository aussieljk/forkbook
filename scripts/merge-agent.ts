/**
 * Merge an agent's worktree branch into master, check it, then remove the worktree and the branch.
 * master must stay the only branch.
 *
 *   bun run merge-agent worktree-agent-abc123          merge, verify, clean up
 *   bun run merge-agent worktree-agent-abc123 --all    verify with a full build
 *
 * A fast-forward to a tree that already passed a full verify (in the agent's worktree) skips
 * verify. Other merges run only the tests that the merge changed. The main session runs the full
 * verify before it pushes.
 *
 * A conflict in bun.lock is fixed by running `bun install`. Other conflicts stop the merge, so a
 * person or agent can fix them, commit, and run this again.
 */
import { spawnSync } from 'node:child_process';

import { ROOT_DIRECTORY } from './utils/constants.ts';
import { emitEvent, flushOtel, initOtel } from './utils/otel.ts';
import { isVerified } from './utils/verified-trees.ts';

const [branch, ...verifyArgs] = process.argv.slice(2);
if (!branch) {
  console.error('Give the branch to merge, for example: bun run merge-agent worktree-agent-abc123');
  process.exit(1);
}

function git(...args: string[]) {
  const result = spawnSync('git', args, { cwd: ROOT_DIRECTORY, encoding: 'utf8' });
  return { ok: result.status === 0, out: `${result.stdout}${result.stderr}`.trim() };
}

function run(command: string, args: string[]) {
  return spawnSync(command, args, { cwd: ROOT_DIRECTORY, stdio: 'inherit' }).status === 0;
}

// One `merge-agent` event for each run, to see how often agent branches merge and verify cleanly.
initOtel('forkbook-merge-agent');
const startedAt = Date.now();
const stats: Record<string, string | number | boolean> = { 'agent.branch': branch };

async function finish(result: 'merged' | 'failed', message?: string) {
  emitEvent(
    'merge-agent',
    {
      ...stats,
      'merge.result': result,
      'merge.seconds': Math.round((Date.now() - startedAt) / 1000),
      ...(message ? { 'merge.error': message.split('\n')[0] } : {}),
    },
    result === 'merged' ? 'INFO' : 'ERROR'
  );
  await flushOtel();
}

async function fail(message: string): Promise<never> {
  console.error(message);
  await finish('failed', message);
  process.exit(1);
}

if (git('branch', '--show-current').out !== 'master') {
  await fail('Switch to master first.');
}
if (git('status', '--porcelain', '--untracked-files=no').out !== '') {
  await fail('master has changes that are not committed. Commit them first.');
}

stats['agent.commits'] = Number(git('rev-list', '--count', `master..${branch}`).out) || 0;
stats['agent.files_changed'] = git('diff', '--name-only', `master...${branch}`)
  .out.split('\n')
  .filter(Boolean).length;

const base = git('rev-parse', 'HEAD').out;
const merged = git('branch', '--merged', 'master', '--format=%(refname:short)')
  .out.split('\n')
  .includes(branch);
if (!merged) {
  const merge = git('merge', '--no-edit', branch);
  if (!merge.ok) {
    const conflicts = git('diff', '--name-only', '--diff-filter=U').out.split('\n').filter(Boolean);
    if (conflicts.length !== 1 || conflicts[0] !== 'bun.lock') {
      await fail(
        `Merge conflicts to fix by hand, then commit and run this again:\n${conflicts.join('\n')}`
      );
    }
    stats['merge.lock_conflict'] = true;
    git('checkout', '--theirs', 'bun.lock');
    if (!run('bun', ['install'])) await fail('bun install failed.');
    git('add', 'bun.lock');
    if (!git('commit', '--no-edit').ok) await fail('Could not commit the merge.');
  }
}

if (!run('bun', ['install'])) await fail('bun install failed.');
const fastForward = git('rev-parse', 'HEAD').out === git('rev-parse', branch).out;
const clean = git('status', '--porcelain').out === '';
const tree = git('rev-parse', 'HEAD^{tree}').out;
if (fastForward && clean && verifyArgs.length === 0 && isVerified(tree)) {
  stats['merge.verify'] = 'skipped';
  console.log('Fast-forward to a tree that already passed verify. Verify is skipped.');
} else {
  stats['merge.verify'] = 'changed';
  if (!run('bun', ['scripts/verify.ts', `--changed=${base}`, ...verifyArgs])) {
    await fail(
      `The merge is on master, but verify failed. Fix master. The branch ${branch} is still there.`
    );
  }
}

const worktree = git('worktree', 'list', '--porcelain')
  .out.split('\n\n')
  .find((entry) => entry.includes(`branch refs/heads/${branch}`))
  ?.match(/^worktree (.+)$/m)?.[1];
// Agent worktrees are locked, and a locked worktree needs --force twice.
if (worktree && !git('worktree', 'remove', '--force', '--force', worktree).ok) {
  await fail(`Could not remove the worktree ${worktree}.`);
}
if (!git('branch', '-D', branch).ok) await fail(`Could not delete the branch ${branch}.`);
console.log(`Merged ${branch}, verified, and removed its worktree and branch.`);
await finish('merged');
