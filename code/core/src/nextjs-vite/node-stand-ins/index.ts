/**
 * Browser stand-ins for the small part of `node:fs` and `node:path` that async server pages use
 * to read project files at build time. The nextjs-vite preset aliases the Node modules to virtual
 * modules that call these functions (see `plugin.ts`).
 */

let projectRoot = '/';

/** Sets the project root. `process.cwd()` and `path.resolve()` use it. */
export function setProjectRoot(root: string) {
  projectRoot = normalize(root.replace(/\\/g, '/')).replace(/(.)\/$/, '$1');
  const g = globalThis as { process?: { cwd?: () => string; env?: object } };
  g.process ??= { env: {} };
  g.process.cwd = () => projectRoot;
}

export function getProjectRoot() {
  return projectRoot;
}

// path (posix) ------------------------------------------------------------------------------

export const sep = '/';
export const delimiter = ':';

export function isAbsolute(p: string) {
  return p.startsWith('/');
}

export function normalize(p: string) {
  if (p === '') return '.';
  const absolute = isAbsolute(p);
  const trailing = p.endsWith('/');
  const parts: string[] = [];
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (parts.length && parts[parts.length - 1] !== '..') parts.pop();
      else if (!absolute) parts.push('..');
    } else {
      parts.push(part);
    }
  }
  const out = parts.join('/');
  if (absolute) return '/' + out + (trailing && out ? '/' : '');
  if (out === '') return trailing ? './' : '.';
  return trailing ? out + '/' : out;
}

export function join(...parts: string[]) {
  return normalize(parts.filter((p) => p !== '').join('/'));
}

export function resolve(...parts: string[]) {
  let out = '';
  for (let i = parts.length - 1; i >= 0 && !isAbsolute(out); i--) {
    if (parts[i]) out = out ? `${parts[i]}/${out}` : parts[i];
  }
  if (!isAbsolute(out)) out = out ? `${projectRoot}/${out}` : projectRoot;
  return normalize(out).replace(/(.)\/$/, '$1');
}

export function dirname(p: string) {
  const trimmed = p.length > 1 ? p.replace(/\/+$/, '') : p;
  const index = trimmed.lastIndexOf('/');
  if (index === -1) return '.';
  if (index === 0) return '/';
  return trimmed.slice(0, index);
}

export function basename(p: string, ext?: string) {
  const trimmed = p.length > 1 ? p.replace(/\/+$/, '') : p;
  const base = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  return ext && base.endsWith(ext) && base !== ext ? base.slice(0, -ext.length) : base;
}

export function extname(p: string) {
  const base = basename(p);
  const index = base.lastIndexOf('.');
  return index <= 0 ? '' : base.slice(index);
}

export function relative(from: string, to: string) {
  const a = resolve(from).split('/').filter(Boolean);
  const b = resolve(to).split('/').filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...Array<string>(a.length - i).fill('..'), ...b.slice(i)].join('/');
}

export function parse(p: string) {
  const base = basename(p);
  const ext = extname(p);
  return {
    root: isAbsolute(p) ? '/' : '',
    dir: dirname(p),
    base,
    ext,
    name: ext ? base.slice(0, -ext.length) : base,
  };
}

export function format(p: {
  dir?: string;
  root?: string;
  base?: string;
  name?: string;
  ext?: string;
}) {
  const base = p.base ?? `${p.name ?? ''}${p.ext ?? ''}`;
  const dir = p.dir ?? p.root ?? '';
  if (!dir) return base;
  return dir.endsWith('/') ? dir + base : `${dir}/${base}`;
}

const pathFunctions = {
  sep,
  delimiter,
  isAbsolute,
  normalize,
  join,
  resolve,
  dirname,
  basename,
  extname,
  relative,
  parse,
  format,
};

export const path: typeof pathFunctions & { posix: typeof pathFunctions } = {
  ...pathFunctions,
  posix: pathFunctions,
};

// fs ----------------------------------------------------------------------------------------

type Callback = (error: Error | null, data?: string | Uint8Array) => void;

function notFound(p: string, syscall: string) {
  const error = new Error(
    `ENOENT: no such file or directory, ${syscall} '${p}'. In the browser, Forkbook can only read the text files of the project.`
  ) as Error & { code: string; path: string; syscall: string };
  error.code = 'ENOENT';
  error.path = p;
  error.syscall = syscall;
  return error;
}

function toPath(p: unknown) {
  return p instanceof URL ? decodeURIComponent(p.pathname) : String(p);
}

function encodingOf(options: unknown) {
  if (typeof options === 'string') return options;
  return (options as { encoding?: string } | null | undefined)?.encoding;
}

/**
 * Makes the fs stand-in.
 *
 * @param files File contents. Each key is a path from the project root, as `import.meta.glob`
 *   gives it (`./content/x.md` or `/content/x.md`).
 */
export function createFs(files: Record<string, string>) {
  const byPath = new Map<string, string>();
  for (const [key, value] of Object.entries(files)) {
    byPath.set(normalize(key.replace(/^\.?\//, '')), value);
  }

  const relativeKey = (p: unknown) => relative(projectRoot, resolve(toPath(p)));

  function readFileSync(p: unknown, options?: unknown): string | Uint8Array {
    const content = byPath.get(relativeKey(p));
    if (content === undefined) throw notFound(toPath(p), 'open');
    return encodingOf(options) ? content : new TextEncoder().encode(content);
  }

  function existsSync(p: unknown) {
    const key = relativeKey(p);
    if (key === '' || byPath.has(key)) return true;
    const prefix = key + '/';
    for (const file of byPath.keys()) if (file.startsWith(prefix)) return true;
    return false;
  }

  /** Callback form, as in `node:fs`. */
  function readFile(p: unknown, options?: unknown, callback?: Callback) {
    const cb = (typeof options === 'function' ? options : callback) as Callback | undefined;
    const opts = typeof options === 'function' ? undefined : options;
    queueMicrotask(() => {
      try {
        cb?.(null, readFileSync(p, opts));
      } catch (error) {
        cb?.(error as Error);
      }
    });
  }

  const promises = {
    readFile: async (p: unknown, options?: unknown) => readFileSync(p, options),
    access: async (p: unknown) => {
      if (!existsSync(p)) throw notFound(toPath(p), 'access');
    },
  };

  return { readFileSync, existsSync, readFile, promises };
}
