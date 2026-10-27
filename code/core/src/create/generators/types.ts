import type { NpmOptions, ProjectType } from '@aussieljk/forkbook/internal/cli';
import type { JsPackageManager, PackageManagerName } from '@aussieljk/forkbook/internal/common';
import type { ConfigFile } from '@aussieljk/forkbook/internal/csf-tools';
import type {
  Feature,
  ForkbookConfig,
  SupportedBuilder,
  SupportedFramework,
  SupportedLanguage,
  SupportedRenderer,
} from '@aussieljk/forkbook/internal/types';

import type { DependencyCollector } from '../dependency-collector.ts';
import type { TelemetryService } from '../services/TelemetryService.ts';
import type { FrameworkPreviewParts } from './configure.ts';

export type GeneratorOptions = {
  language: SupportedLanguage;
  builder: SupportedBuilder;
  framework: SupportedFramework;
  renderer: SupportedRenderer;
  storybookVersionSpecifier?: string;
  linkable: boolean;
  frameworkPreviewParts?: FrameworkPreviewParts;
  // skip prompting the user
  yes: boolean;
  features: Set<Feature>;
  dependencyCollector: DependencyCollector;
};

export interface FrameworkOptions {
  extraPackages?: string[] | ((details: { builder: SupportedBuilder }) => Promise<string[]>);
  extraAddons?: string[];
  staticDir?: string;
  addScripts?: boolean;
  addComponents?: boolean;
  extraMain?: any;
  extensions?: string[];
  storybookConfigFolder?: string;
  componentsDestinationPath?: string;
  installFrameworkPackages?: boolean;
  skipGenerator?: boolean;
  storybookCommand?: string | null;
  shouldRunDev?: boolean;
  frameworkPreviewParts?: FrameworkPreviewParts;
}

export type Generator<T = Record<string, any>> = (
  packageManagerInstance: JsPackageManager,
  npmOptions: NpmOptions,
  generatorOptions: GeneratorOptions,
  commandOptions?: CommandOptions
) => Promise<
  {
    rendererPackage: string;
    builderPackage: string;
    frameworkPackage: string;
    configDir: string;
    mainConfig?: ForkbookConfig;
    mainConfigCSFFile?: ConfigFile;
    previewConfigPath?: string;
  } & T
>;

// New generator interface for configuration-based generators

export interface GeneratorMetadata {
  projectType: ProjectType;
  renderer: SupportedRenderer;
  /** The framework package. When not set, it is detected from the renderer and the builder. */
  framework?: SupportedFramework | null;
  /** The builder to use when the CLI options do not give one. When not set, it is detected. */
  builderOverride?: SupportedBuilder;
}

export interface GeneratorContext {
  framework: SupportedFramework | null | undefined;
  renderer: SupportedRenderer;
  builder: SupportedBuilder;
  language: SupportedLanguage;
  storybookVersionSpecifier?: string;
  telemetryService: TelemetryService;
  features: Set<Feature>;
  dependencyCollector: DependencyCollector;
  linkable?: boolean;
  yes?: boolean;
}

export interface GeneratorModule {
  /** Metadata about the generator This is used to register the generator with the generator registry */
  metadata: GeneratorMetadata;
  /**
   * The function that configures the generator This is used to configure the generator It returns a
   * promise that resolves to the framework options
   */
  configure: (
    packageManager: JsPackageManager,
    context: GeneratorContext
  ) => Promise<FrameworkOptions>;
  /**
   * The function that runs after the generator is configured. This is used to run any
   * post-configuration tasks
   */
  postConfigure?: ({
    packageManager,
  }: {
    packageManager: JsPackageManager;
  }) => Promise<void> | void;
  /**
   * The function that runs after dependencies have been installed. Use this for tasks that require
   * the project's dependencies (e.g. CLI tools shipped by a dependency) to be available on disk.
   *
   * Examples: re-aligning native package versions in an Expo project with `npx expo install --fix`.
   */
  postInstall?: ({ packageManager }: { packageManager: JsPackageManager }) => Promise<void> | void;
}

export type CommandOptions = {
  packageManager: PackageManagerName;
  storybookVersionSpecifier?: string;
  features?: Array<Feature>;
  type?: ProjectType;
  force?: any;
  /** Whether this is being run via an ai agent */
  agent?: boolean;
  skipInstall?: boolean;
  language?: SupportedLanguage;
  parser?: string;
  /** Automatically answer yes to prompts */
  yes?: boolean;
  builder?: SupportedBuilder;
  linkable?: boolean;
  disableTelemetry?: boolean;
  enableCrashReports?: boolean;
  debug?: boolean;
  dev?: boolean;
  logfile?: string | boolean;
};
