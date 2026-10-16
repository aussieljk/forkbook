/**
 * This entry is to ensure we use a single version of Babel across the codebase. This is to prevent
 * issues with multiple versions of Babel being used in the same project. It also prevents us from
 * bundling babel multiple times in the final bundles.
 */
import bg from '@babel/generator';
import * as parser from '@babel/parser';
import bt from '@babel/traverse';
import * as types from '@babel/types';
import * as recast from 'recast';

export * from './babelParse.ts';
export { createBabelFile } from './babel-file.ts';
export type { BabelFile } from './babel-file.ts';
export { unwrapTSExpression, resolveExpression } from './expression-resolver.ts';
export {
  isImportedDefineConfigLikeIdentifier,
  isDefineConfigLike,
  getConfigObjectFromMergeArg,
  getEffectiveMergeConfigCall,
  getTargetConfigObject,
  canUpdateVitestConfigFile,
} from './vitest-config-helpers.ts';

// @ts-expect-error (needed due to it's use of `exports.default`)
const traverse = (bt.default || bt) as typeof bt;
// @ts-expect-error (needed due to it's use of `exports.default`)
const generate = (bg.default || bg) as typeof bg;

export {
  // main
  generate,
  traverse,
  types,
  parser,

  // other
  recast,
};

export type { NodePath } from '@babel/traverse';
export type { GeneratorOptions } from '@babel/generator';
export type { Options as RecastOptions } from 'recast';
