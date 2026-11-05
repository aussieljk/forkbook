import { readFile, writeFile } from 'node:fs/promises';

import {
  type BabelFile,
  type GeneratorOptions,
  type NodePath,
  type RecastOptions,
  babelParse,
  createBabelFile,
  generate,
  recast,
  types as t,
} from '@aussieljk/forkbook/internal/babel';
import {
  isExportStory,
  storyNameFromExport,
  toId,
  toTestId,
} from '@aussieljk/forkbook/internal/csf/csf-utils';
import { logger } from '@aussieljk/forkbook/internal/node-logger';
import type {
  ComponentAnnotations,
  IndexInput,
  IndexInputStats,
  IndexedCSFFile,
  StoryAnnotations,
} from '@aussieljk/forkbook/internal/types';

import { dedent } from 'ts-dedent';

import { Tag } from '../shared/constants/tags.ts';
import type { PrintResultType } from './PrintResultType.ts';
import type { CsfMutationDiagnostic, CsfObject, CsfObjectOptions } from './CsfObject.ts';
import { discoverCsfObjects } from './CsfObjectDiscovery.ts';
import { MultipleMetaError, NoMetaError, formatLocation } from './csfFileErrors.ts';
import {
  hasMount,
  isModuleMock,
  parseIncludeExclude,
  parseTags,
  sortExports,
  staticThumbnail,
} from './csfFileParsers.ts';
import { traverseCsf } from './csfFileTraverse.ts';
import { findVarInitialization } from './findVarInitialization.ts';
import { isCanonicalCsf2BindCall, unwrapExpression } from './story-shape/utils.ts';

export {
  BadMetaError,
  MixedFactoryError,
  MultipleMetaError,
  NoMetaError,
} from './csfFileErrors.ts';
export { isModuleMock, isValidPreviewPath, staticThumbnail } from './csfFileParsers.ts';

type CsfMutationState = {
  diagnostics: CsfMutationDiagnostic[];
  changed: boolean;
};

const mutationStates = new WeakMap<CsfFile, CsfMutationState>();

export interface CsfOptions {
  fileName?: string;
  makeTitle: (userTitle: string) => string;
  /**
   * If an inline meta is detected e.g. `export default { title: 'foo' }` it will be transformed
   * into a constant format e.g. `export const _meta = { title: 'foo' }; export default _meta;`
   */
  transformInlineMeta?: boolean;
}

export interface StaticMeta extends Pick<
  ComponentAnnotations,
  'id' | 'title' | 'includeStories' | 'excludeStories' | 'tags'
> {
  component?: string;
}

export interface StaticStory extends Pick<StoryAnnotations, 'name' | 'parameters' | 'tags'> {
  id: string;
  localName?: string;
  __stats: IndexInputStats;
}

export interface StoryTest {
  node: t.Node;
  function: t.Node;
  name: string;
  id: string;
  tags: string[];
  parent: { node: t.Node | undefined };
}

export class CsfFile {
  _ast: t.File;

  _file: BabelFile;

  _options: CsfOptions;

  _rawComponentPath?: string;

  _componentImportSpecifier?: t.ImportSpecifier | t.ImportDefaultSpecifier;

  _meta?: StaticMeta;

  _stories: Record<string, StaticStory> = {};

  _metaAnnotations: Record<string, t.Node> = {};

  _storyExports: Record<string, t.VariableDeclarator | t.FunctionDeclaration> = {};

  _storyDeclarationPath: Record<string, NodePath<t.VariableDeclarator | t.FunctionDeclaration>> =
    {};

  _storyPaths: Record<string, NodePath<t.ExportNamedDeclaration>> = {};

  _metaStatement: t.Statement | undefined;

  _metaStatementPath: NodePath<t.Statement> | undefined;

  _metaNode: t.ObjectExpression | undefined;

  _metaPath: NodePath<t.ExportDefaultDeclaration> | undefined;

  _metaVariableName: string | undefined;

  _metaIsFactory: boolean | undefined;

  _metaFactoryCall: t.CallExpression | undefined;

  /**
   * True when the CSF factory configuration could not be resolved to an object literal in this
   * file, so `_metaNode` is a stand-in that is not part of the AST. Writes to it are discarded.
   */
  _metaNodeIsSynthetic: boolean | undefined;

  /** `undefined` for a re-exported story that is not declared in this file. */
  _storyStatements: Record<string, t.ExportNamedDeclaration | t.Expression | undefined> = {};

  _storyAnnotations: Record<string, Record<string, t.Node>> = {};

  _templates: Record<string, t.Expression> = {};

  _namedExportsOrder?: string[];

  imports: string[];

  _tests: StoryTest[] = [];

  constructor(ast: t.File, options: CsfOptions, file: BabelFile) {
    this._ast = ast;
    this._file = file;
    this._options = options;
    this.imports = [];
    mutationStates.set(this, { diagnostics: [], changed: false });
  }

  /**
   * Read diagnostics from object discovery, reads, and mutations. Check them before writing
   * because a file can contain both successful edits and unsupported targets.
   *
   * @example
   * ```ts
   * const [story] = csf.objects({ meta: false });
   * story.set(['args', 'old'], 1);
   * story.set(['args', 'current'], 2);
   * story.rename(['args', 'old'], 'current');
   * csf.mutationDiagnostics.map(({ code }) => code); // ['occupied-destination']
   * ```
   */
  get mutationDiagnostics(): readonly CsfMutationDiagnostic[] {
    return [...mutationStates.get(this)!.diagnostics];
  }

  /**
   * Report whether any object editor has changed this story file.
   *
   * @example
   * ```ts
   * csf.changed; // false, before any edits
   * const [story] = csf.objects({ meta: false });
   * story.set(['args', 'disabled'], true);
   * csf.changed; // true
   * ```
   */
  get changed() {
    return mutationStates.get(this)!.changed;
  }

  /**
   * Discover editors for the meta and stories, including CSF2 parameter and argTypes assignments. Unsupported
   * targets are skipped and reported in `mutationDiagnostics`.
   *
   * @example
   * ```ts
   * const csf = loadCsf('export default {}; export const Primary = {};', {
   *   makeTitle: () => 'Example',
   * }).parse();
   * const [story] = csf.objects({ meta: false });
   * story.set(['args', 'disabled'], true);
   * story.getValue(['args']); // { disabled: true }
   * csf.changed; // true
   * ```
   */
  objects(options: CsfObjectOptions = {}): readonly CsfObject[] {
    const state = mutationStates.get(this)!;
    return discoverCsfObjects(
      this,
      options,
      (diagnostic) => state.diagnostics.push(diagnostic),
      () => {
        state.changed = true;
      }
    );
  }

  _parseTitle(value: t.Node) {
    const node = t.isIdentifier(value)
      ? findVarInitialization(value.name, this._ast.program)
      : value;
    if (t.isStringLiteral(node)) {
      return node.value;
    }
    if (t.isTSSatisfiesExpression(node) && t.isStringLiteral(node.expression)) {
      return node.expression.value;
    }

    throw new Error(dedent`
      CSF: unexpected dynamic title ${formatLocation(node, this._options.fileName)}

      More info: https://forkbook.ljk.dev/docs/migration#string-literal-titles
    `);
  }

  /**
   * Gets the properties of the meta object. Spreads of object literals, or of identifiers that
   * refer to object literals, are expanded. Other spreads are returned in `unresolved`, with the
   * number of properties that come before them.
   */
  _flattenMetaProperties(
    declaration: t.ObjectExpression,
    program: t.Program,
    seen = new Set<string>()
  ) {
    const properties: t.ObjectProperty[] = [];
    const unresolved: { index: number; node: t.Node }[] = [];
    for (const p of declaration.properties) {
      if (!t.isSpreadElement(p)) {
        properties.push(p as t.ObjectProperty);
        continue;
      }
      let arg: t.Node | undefined = unwrapExpression(p.argument);
      if (t.isIdentifier(arg) && !seen.has(arg.name)) {
        seen.add(arg.name);
        const init = findVarInitialization(arg.name, program);
        arg = init ? unwrapExpression(init) : undefined;
      }
      if (t.isObjectExpression(arg)) {
        const inner = this._flattenMetaProperties(arg, program, seen);
        inner.unresolved.forEach((u) =>
          unresolved.push({ index: properties.length + u.index, node: u.node })
        );
        properties.push(...inner.properties);
      } else {
        unresolved.push({ index: properties.length, node: p });
      }
    }
    return { properties, unresolved };
  }

  _parseMeta(declaration: t.ObjectExpression, program: t.Program) {
    if (this._metaNode) {
      throw new MultipleMetaError('multiple meta objects', declaration, this._options.fileName);
    }
    this._metaNode = declaration;
    const meta: StaticMeta = {};
    const { properties, unresolved } = this._flattenMetaProperties(declaration, program);
    // A spread that we cannot read can set `title` or `tags`. Warn when no later static
    // property sets the field, because the indexer then ignores the value.
    for (const { index, node } of unresolved) {
      for (const field of ['title', 'tags']) {
        const setLater = properties
          .slice(index)
          .some((p) => t.isIdentifier(p.key) && p.key.name === field);
        if (!setLater) {
          logger.warn(dedent`
            CSF: cannot read the "${field}" of the default export statically, because it can come from a dynamic value ${formatLocation(node, this._options.fileName)}.
            The indexer ignores a "${field}" that comes from this value. Set "${field}" directly in the meta object.
          `);
        }
      }
    }
    properties.forEach((p) => {
      if (t.isIdentifier(p.key)) {
        const value = t.isObjectMethod(p) ? p : p.value;
        this._metaAnnotations[p.key.name] = value;

        if (p.key.name === 'title') {
          meta.title = this._parseTitle(p.value);
        } else if (['includeStories', 'excludeStories'].includes(p.key.name)) {
          meta[p.key.name as 'includeStories' | 'excludeStories'] = parseIncludeExclude(p.value);
        } else if (p.key.name === 'component') {
          const n = p.value;
          if (t.isIdentifier(n)) {
            const id = n.name;
            const importStmt = program.body.find(
              (stmt) =>
                t.isImportDeclaration(stmt) &&
                stmt.specifiers.find((spec) => spec.local.name === id)
            ) as t.ImportDeclaration;
            if (importStmt) {
              // Example: `import { ComponentImport } from './path-to-component'`
              // const meta = { component: ComponentImport };
              // Sets:
              // - _rawComponentPath = './path-to-component'
              // - _componentImportSpecifier = ComponentImport
              const { source } = importStmt;
              const specifier = importStmt.specifiers.find((spec) => spec.local.name === id);
              if (t.isStringLiteral(source) && specifier) {
                this._rawComponentPath = source.value;
                if (t.isImportSpecifier(specifier) || t.isImportDefaultSpecifier(specifier)) {
                  this._componentImportSpecifier = specifier;
                }
              }
            }
          }
          const { code } = recast.print(p.value, {});
          meta.component = code;
        } else if (p.key.name === 'tags') {
          meta.tags = parseTags(
            t.isIdentifier(p.value)
              ? findVarInitialization(p.value.name, this._ast.program)
              : p.value
          );
        } else if (p.key.name === 'id') {
          if (t.isStringLiteral(p.value)) {
            meta.id = p.value.value;
          } else {
            throw new Error(`Unexpected component id: ${p.value}`);
          }
        }
      }
    });
    this._meta = meta;
  }

  getStoryExport(key: string) {
    let node = this._storyExports[key] as t.Node;
    node = t.isVariableDeclarator(node) ? (node.init as t.Node) : node;
    if (isCanonicalCsf2BindCall(node)) {
      node = this._templates[node.callee.object.name];
    }
    return node;
  }

  parse() {
    traverseCsf(this);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    if (!self._meta) {
      throw new NoMetaError('missing default export', self._ast, self._options.fileName);
    }

    // default export can come at any point in the file, so we do this post processing last
    const entries = Object.entries(self._stories);
    self._meta.title = this._options.makeTitle(self._meta?.title as string);
    if (self._metaAnnotations.play) {
      self._meta.tags = [...(self._meta.tags || []), Tag.PLAY_FN];
    }
    self._stories = entries.reduce(
      (acc, [key, story]) => {
        if (!isExportStory(key, self._meta as StaticMeta)) {
          return acc;
        }
        const id =
          story.parameters?.__id ??
          toId((self._meta?.id || self._meta?.title) as string, storyNameFromExport(key));
        const parameters: Record<string, any> = { ...story.parameters, __id: id };

        const { includeStories } = self._meta || {};
        if (
          key === '__page' &&
          (entries.length === 1 || (Array.isArray(includeStories) && includeStories.length === 1))
        ) {
          parameters.docsOnly = true;
        }
        acc[key] = { ...story, id, parameters };
        const storyAnnotations = self._storyAnnotations[key];
        const { tags, play } = storyAnnotations;
        if (tags) {
          const node = t.isIdentifier(tags)
            ? findVarInitialization(tags.name, this._ast.program)
            : tags;
          acc[key].tags = parseTags(node);
        }
        if (play) {
          acc[key].tags = [...(acc[key].tags || []), Tag.PLAY_FN];
        }
        const stats = acc[key].__stats;
        ['play', 'render', 'loaders', 'beforeEach', 'globals', 'tags'].forEach((annotation) => {
          stats[annotation as keyof IndexInputStats] =
            !!storyAnnotations[annotation] || !!self._metaAnnotations[annotation];
        });
        const storyExport = self.getStoryExport(key);
        stats.storyFn = !!(
          t.isArrowFunctionExpression(storyExport) || t.isFunctionDeclaration(storyExport)
        );
        stats.mount = hasMount(storyAnnotations.play ?? self._metaAnnotations.play);
        stats.moduleMock = !!self.imports.find((fname) => isModuleMock(fname));

        const storyNode = self._storyStatements[key];
        const storyTests = self._tests.filter((t) => t.parent.node === storyNode);
        if (storyTests.length > 0) {
          // TODO: [test-syntax] if we want to add a tag for the story that contains tests, this is the place for it
          // acc[key].tags = [...(acc[key].tags || []), 'story-with-tests'];

          stats.tests = true;
          storyTests.forEach((test) => {
            test.id = toTestId(id, test.name);
          });
        }

        return acc;
      },
      {} as Record<string, StaticStory>
    );

    Object.keys(self._storyExports).forEach((key) => {
      if (!isExportStory(key, self._meta as StaticMeta)) {
        delete self._storyExports[key];
        delete self._storyAnnotations[key];
        delete self._storyStatements[key];
      }
    });

    if (self._namedExportsOrder) {
      const unsortedExports = Object.keys(self._storyExports);
      self._storyExports = sortExports(self._storyExports, self._namedExportsOrder);
      self._stories = sortExports(self._stories, self._namedExportsOrder);

      const sortedExports = Object.keys(self._storyExports);
      if (unsortedExports.length !== sortedExports.length) {
        throw new Error(
          `Missing exports after sort: ${unsortedExports.filter(
            (key) => !sortedExports.includes(key)
          )}`
        );
      }
    }

    return self as CsfFile & IndexedCSFFile;
  }

  public get meta() {
    return this._meta;
  }

  public get stories() {
    return Object.values(this._stories);
  }

  public getStoryTests(story: string | t.Node) {
    const storyNode = typeof story === 'string' ? this._storyStatements[story] : story;
    if (!storyNode) {
      return [];
    }
    return this._tests.filter((t) => t.parent.node === storyNode);
  }

  public get indexInputs(): IndexInput[] {
    const { fileName } = this._options;
    if (!fileName) {
      throw new Error(
        dedent`Cannot automatically create index inputs with CsfFile.indexInputs because the CsfFile instance was created without a the fileName option.
        Either add the fileName option when creating the CsfFile instance, or create the index inputs manually.`
      );
    }

    const index: IndexInput[] = [];

    Object.entries(this._stories).map(([exportName, story]) => {
      // don't remove any duplicates or negations -- tags will be combined in the index
      const tags = [...(this._meta?.tags ?? []), ...(story.tags ?? [])];
      const thumbnail =
        staticThumbnail(this._storyAnnotations[exportName]?.parameters) ??
        staticThumbnail(this._metaAnnotations.parameters);
      const storyInput = {
        ...(thumbnail ? { thumbnail } : {}),
        rawComponentPath: this._rawComponentPath,
        exportName,
        title: this.meta?.title,
        metaId: this.meta?.id,
        tags,
        __id: story.id,
        __stats: story.__stats,
      };

      const tests = this.getStoryTests(exportName);
      const hasTests = tests.length > 0;

      index.push({
        ...storyInput,
        type: 'story',
        subtype: 'story',
        name: story.name,
      });

      if (hasTests) {
        tests.forEach((test) => {
          index.push({
            ...storyInput,
            // TODO implementent proper title => path behavior in `transformStoryIndexToStoriesHash`
            // title: `${storyInput.title}/${story.name}`,
            type: 'story',
            subtype: 'test',
            name: test.name,
            parent: story.id,
            parentName: story.name,
            tags: [
              ...storyInput.tags,
              // this tag comes before test tags so users can invert if they like
              `!${Tag.AUTODOCS}`,
              ...test.tags,
              // this tag comes after test tags so users can't change it
              Tag.TEST_FN,
            ],
            __id: test.id,
          });
        });
      }
    });

    return index;
  }
}

/** A parsed file with its Program path, so paths have scopes and `buildCodeFrameError`. */
export const babelParseFile = ({
  code,
  filename = '',
  ast,
}: {
  code: string;
  filename?: string;
  ast?: t.File;
}): BabelFile => {
  return createBabelFile({ code, ast: ast ?? babelParse(code), filename });
};

export const loadCsf = (code: string, options: CsfOptions) => {
  const ast = babelParse(code);
  const file = babelParseFile({ code, filename: options.fileName, ast });
  return new CsfFile(ast, options, file);
};

export const formatCsf = (
  csf: CsfFile,
  options: GeneratorOptions & { inputSourceMap?: any } = { sourceMaps: false },
  code?: string
): ReturnType<typeof generate> | string => {
  const result = generate(csf._ast, options, code);
  if (options.sourceMaps) {
    return result;
  }
  return result.code;
};

/** Use this function, if you want to preserve styles. Uses recast under the hood. */
export const printCsf = (csf: CsfFile, options: RecastOptions = {}): PrintResultType => {
  return recast.print(csf._ast, {
    // Recast defaults this to `os.EOL`, which would carriage-return printed files on Windows.
    lineTerminator: '\n',
    ...options,
  });
};

export const readCsf = async (fileName: string, options: CsfOptions) => {
  const code = (await readFile(fileName, 'utf-8')).toString();
  return loadCsf(code, { ...options, fileName });
};

export const writeCsf = async (csf: CsfFile, fileName?: string) => {
  const fname = fileName || csf._options.fileName;

  if (!fname) {
    throw new Error('Please specify a fileName for writeCsf');
  }
  await writeFile(fileName as string, printCsf(csf).code);
};
