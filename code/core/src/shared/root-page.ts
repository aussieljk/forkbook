import { relative, resolve } from 'pathe';

import type { RootPageOptions } from '../types/modules/core-common.ts';

/** The start page settings that the server gives to the manager (`global.FORKBOOK_ROOT`). */
export interface RootPageGlobal {
  /** False when `root: false`: `/` then opens the first story. */
  enabled: boolean;
  /** `above`: the MDX shows above the grid. `replace`: only the MDX shows. */
  mode: 'above' | 'replace';
  /** The index `importPath` of the MDX file (for example `./.forkbook/Home.mdx`), if there is one. */
  mdxImportPath?: string;
}

/** The MDX file of the start page as an absolute path, or `undefined`. */
export const rootMdxPath = (root: RootPageOptions | undefined, configDir: string) =>
  root && root.mdx ? resolve(configDir, root.mdx) : undefined;

/** Changes the `root` main config to the settings that the manager uses. */
export const resolveRootPage = (
  root: RootPageOptions | undefined,
  { configDir, workingDir }: { configDir: string; workingDir: string }
): RootPageGlobal => {
  if (root === false) {
    return { enabled: false, mode: 'above' };
  }
  const mode = root?.mode === 'replace' ? 'replace' : 'above';
  const mdx = rootMdxPath(root, configDir);
  if (!mdx) {
    return { enabled: true, mode };
  }
  const path = relative(workingDir, mdx);
  return { enabled: true, mode, mdxImportPath: path.startsWith('.') ? path : `./${path}` };
};
