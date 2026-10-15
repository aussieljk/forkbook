import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import memoize from 'memoizerific';

import { ROOT_DIRECTORY } from './constants.ts';

export type Workspace = { name: string; location: string };

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

/**
 * Get the list of workspaces in the monorepo, excluding the scripts and root packages. Locations
 * are relative to the code directory.
 */
export async function getCodeWorkspaces(): Promise<Workspace[]> {
  const { workspaces } = readJson(join(ROOT_DIRECTORY, 'package.json'));
  const locations: string[] = workspaces.packages.flatMap((pattern: string) =>
    globSync(pattern, { cwd: ROOT_DIRECTORY })
  );

  return locations
    .filter((location) => location !== 'scripts')
    .filter((location) => existsSync(join(ROOT_DIRECTORY, location, 'package.json')))
    .map((location) => ({
      name: readJson(join(ROOT_DIRECTORY, location, 'package.json')).name,
      location: location === 'code' ? '.' : location.replace('code/', ''),
    }));
}

const getWorkspacesMemo = memoize(1)(getCodeWorkspaces);

export async function workspacePath(type: string, packageName: string) {
  const workspaces = await getWorkspacesMemo();
  const workspace = workspaces.find((w) => w.name === packageName);
  if (!workspace) {
    throw new Error(`Unknown ${type} '${packageName}', not in a workspace!`);
  }
  return workspace.location;
}
