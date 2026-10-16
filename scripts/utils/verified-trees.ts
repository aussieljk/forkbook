/**
 * The git trees that passed a full `bun run verify`. merge-agent skips verify for a fast-forward to
 * one of them. The list is in the git common folder, so every agent worktree and master share it
 * (each worktree has its own node_modules).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { ROOT_DIRECTORY } from './constants.ts';

function git(...args: string[]) {
  return spawnSync('git', args, { cwd: ROOT_DIRECTORY, encoding: 'utf8' }).stdout.trim();
}

export const VERIFIED_TREES = join(
  resolve(ROOT_DIRECTORY, git('rev-parse', '--git-common-dir')),
  'forkbook-verified-trees'
);

/** The tree of HEAD, when the working tree has no changes (untracked files count). */
export function treeIfClean(): string | undefined {
  return git('status', '--porcelain') === '' ? git('rev-parse', 'HEAD^{tree}') : undefined;
}

export function isVerified(tree: string) {
  return (
    existsSync(VERIFIED_TREES) && readFileSync(VERIFIED_TREES, 'utf8').split('\n').includes(tree)
  );
}
