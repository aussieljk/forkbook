/**
 * Merge an agent's worktree branch into master, check it, then remove the worktree and the branch.
 * master must stay the only branch.
 *
 *   bun run merge-agent worktree-agent-abc123          merge, verify, clean up
 *   bun run merge-agent worktree-agent-abc123 --all    verify with a full build
 *
 * A conflict in bun.lock is fixed by running `bun install`. Other conflicts stop the merge, so a
 * person or agent can fix them, commit, and run this again.
 */
import { spawnSync } from 'node:child_process';

import { ROOT_DIRECTORY } from './utils/constants.ts';

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

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (git('branch', '--show-current').out !== 'master') {
  fail('Switch to master first.');
}
if (git('status', '--porcelain', '--untracked-files=no').out !== '') {
  fail('master has changes that are not committed. Commit them first.');
}

const merged = git('branch', '--merged', 'master', '--format=%(refname:short)')
  .out.split('\n')
  .includes(branch);
if (!merged) {
  const merge = git('merge', '--no-edit', branch);
  if (!merge.ok) {
    const conflicts = git('diff', '--name-only', '--diff-filter=U').out.split('\n').filter(Boolean);
    if (conflicts.length !== 1 || conflicts[0] !== 'bun.lock') {
      fail(
        `Merge conflicts to fix by hand, then commit and run this again:\n${conflicts.join('\n')}`
      );
    }
    git('checkout', '--theirs', 'bun.lock');
    if (!run('bun', ['install'])) fail('bun install failed.');
    git('add', 'bun.lock');
    if (!git('commit', '--no-edit').ok) fail('Could not commit the merge.');
  }
}

if (!run('bun', ['install'])) fail('bun install failed.');
if (!run('bun', ['scripts/verify.ts', ...verifyArgs])) {
  fail(
    `The merge is on master, but verify failed. Fix master. The branch ${branch} is still there.`
  );
}

const worktree = git('worktree', 'list', '--porcelain')
  .out.split('\n\n')
  .find((entry) => entry.includes(`branch refs/heads/${branch}`))
  ?.match(/^worktree (.+)$/m)?.[1];
if (worktree) git('worktree', 'remove', '--force', worktree);
git('branch', '-D', branch);
console.log(`Merged ${branch}, verified, and removed its worktree and branch.`);
