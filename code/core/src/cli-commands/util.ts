import { getProjectRoot } from '@aussieljk/forkbook/internal/common';

/**
 * Shortens a path to the relative path from the project root
 *
 * @param path - The path to shorten
 * @returns The shortened path
 */
export const shortenPath = (path: string) => {
  const gitRoot = getProjectRoot();
  return path.replace(gitRoot, '');
};
