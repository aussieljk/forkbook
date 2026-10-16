import type { Builder, BuilderStats, Builder_Unpromise } from '@aussieljk/forkbook/internal/types';

/** What the manager builder bundles: one self-running file for each manager entry. */
export type ManagerBuildConfig = {
  entryPoints: string[];
  outdir: string;
  tsconfig: string;
  minify: boolean;
  define: Record<string, string>;
};

export type OutputFile = { path: string; contents: string };

export type ManagerBuilder = Builder<ManagerBuildConfig, BuilderStats>;
export type Compilation = { outputFiles: OutputFile[] };

export type BuilderStartOptions = Parameters<ManagerBuilder['start']>['0'];
export type BuilderStartResult = Builder_Unpromise<ReturnType<ManagerBuilder['start']>>;

export type StarterFunction = (
  options: BuilderStartOptions
) => AsyncGenerator<unknown, BuilderStartResult | void, void>;

export type BuilderBuildOptions = Parameters<ManagerBuilder['build']>['0'];
export type BuilderBuildResult = Builder_Unpromise<ReturnType<ManagerBuilder['build']>>;
export type BuilderFunction = (
  options: BuilderBuildOptions
) => AsyncGenerator<unknown, BuilderBuildResult, void>;
