import { join } from 'node:path';

import type { Plugin } from 'vite';

const STAND_INS = '@aussieljk/forkbook/nextjs-vite/node-stand-ins';

/** Text files that the fs stand-in can read. */
export const TEXT_EXTENSIONS = [
  'md',
  'markdown',
  'txt',
  'json',
  'yml',
  'yaml',
  'toml',
  'csv',
  'tsv',
  'html',
  'xml',
];

export const IGNORED_FOLDERS = [
  'node_modules',
  '.next',
  'dist',
  '.git',
  'storybook-static',
  'coverage',
];

const FS_IDS = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises']);
const PATH_IDS = new Set(['path', 'node:path', 'path/posix', 'node:path/posix']);

const PATH_EXPORTS = [
  'sep',
  'delimiter',
  'isAbsolute',
  'normalize',
  'join',
  'resolve',
  'dirname',
  'basename',
  'extname',
  'relative',
  'parse',
  'format',
];

export function fsModuleCode(root: string, promisesOnly: boolean) {
  const patterns = [
    `./**/*.{${TEXT_EXTENSIONS.join(',')}}`,
    ...IGNORED_FOLDERS.map((folder) => `!**/${folder}/**`),
  ];
  const fsExports = promisesOnly
    ? `export const readFile = fs.promises.readFile;\nexport const access = fs.promises.access;\nexport default fs.promises;`
    : `export const { readFileSync, existsSync, readFile, promises } = fs;\nexport default fs;`;
  return [
    `import { createFs, setProjectRoot } from ${JSON.stringify(STAND_INS)};`,
    `setProjectRoot(${JSON.stringify(root)});`,
    `const files = import.meta.glob(${JSON.stringify(patterns)}, { query: '?raw', import: 'default', eager: true });`,
    `const fs = createFs(files);`,
    fsExports,
  ].join('\n');
}

export function pathModuleCode(root: string) {
  return [
    `import { path, setProjectRoot } from ${JSON.stringify(STAND_INS)};`,
    `setProjectRoot(${JSON.stringify(root)});`,
    `export const { ${[...PATH_EXPORTS, 'posix'].join(', ')} } = path;`,
    `export default path;`,
  ].join('\n');
}

/**
 * Gives browser stand-ins for `node:fs`, `node:fs/promises` and `node:path`, so that async server
 * pages that read project files at build time also render in a story. The files come from
 * `import.meta.glob` over the text files of the project. Paths resolve from the project root, and
 * `process.cwd()` returns it.
 *
 * User aliases for these modules (for example to `.storybook/mocks/`) still win, because Vite
 * applies `resolve.alias` before this plugin.
 */
export function nodeStandInsPlugin(projectRoot: string): Plugin {
  const root = projectRoot.replace(/\\/g, '/');
  // A real path in the project root, so that the relative glob patterns start from the root.
  const fsId = join(projectRoot, '__forkbook_node_fs__.js').replace(/\\/g, '/');
  const fsPromisesId = join(projectRoot, '__forkbook_node_fs_promises__.js').replace(/\\/g, '/');
  const pathId = '\0forkbook-node-path.js';

  return {
    name: 'forkbook:nextjs-node-stand-ins',
    enforce: 'pre',
    resolveId(id, _importer, options) {
      if (options?.ssr) return null;
      if (id === 'fs/promises' || id === 'node:fs/promises') return fsPromisesId;
      if (FS_IDS.has(id)) return fsId;
      if (PATH_IDS.has(id)) return pathId;
      return null;
    },
    load(id) {
      if (id === fsId) return fsModuleCode(root, false);
      if (id === fsPromisesId) return fsModuleCode(root, true);
      if (id === pathId) return pathModuleCode(root);
      return null;
    },
  };
}
