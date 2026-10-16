import { compile as mdxCompile, compileSync as mdxCompileSync } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';

import type { CompileOptions, MdxCompileOptions } from './types';

export type { CompileOptions, MdxCompileOptions };

export const compile = async (
  input: string,
  { mdxCompileOptions = {}, gfm }: CompileOptions = {}
) => {
  const options = getCompilerOptions(mdxCompileOptions, gfm);

  const mdxResult = await mdxCompile(input, options);

  return mdxResult.toString();
};

export const compileSync = (input: string, { mdxCompileOptions = {}, gfm }: CompileOptions = {}) => {
  const options = getCompilerOptions(mdxCompileOptions, gfm);

  const mdxResult = mdxCompileSync(input, options);

  return mdxResult.toString();
};

/**
 * GitHub-flavoured markdown (tables, task lists, strikethrough, autolinks) is on unless `gfm` is
 * false.
 */
function getCompilerOptions(mdxCompileOptions: MdxCompileOptions, gfm = true): MdxCompileOptions {
  const remarkPlugins = mdxCompileOptions?.remarkPlugins ?? [];
  return {
    providerImportSource: '@mdx-js/react',
    rehypePlugins: [],
    ...mdxCompileOptions,
    remarkPlugins: gfm ? [remarkGfm, ...remarkPlugins] : remarkPlugins,
  };
}
